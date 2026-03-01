import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { SUPABASE_CLIENT } from "../supabase/supabase.module.js";
import { IS_PUBLIC_KEY } from "./public.decorator.js";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers["x-api-key"] as string | undefined;

    if (!apiKey) {
      throw new UnauthorizedException("Missing x-api-key header");
    }

    const keyHash = createHash("sha256").update(apiKey).digest("hex");

    // Look up key by hash in the api_keys table
    const { data: apiKeyRow, error: apiKeyError } = await this.supabase
      .from("api_keys")
      .select("user_id")
      .eq("key_hash", keyHash)
      .single();

    if (apiKeyError || !apiKeyRow) {
      throw new UnauthorizedException("Invalid API key");
    }

    const userId: string = apiKeyRow.user_id;

    // Resolve the username for this user
    const { data: profileRow, error: profileError } = await this.supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();

    if (profileError || !profileRow) {
      throw new UnauthorizedException("Invalid API key");
    }

    const username: string = profileRow.username;

    // If there is a :username param in the URL, verify the key owner matches
    const usernameParam: string | undefined =
      request.params?.username?.toLowerCase();
    if (usernameParam && usernameParam !== username) {
      throw new ForbiddenException("API key does not match the requested user");
    }

    // Attach user to the request
    request.user = { userId, username };

    // Fire-and-forget: update last_used_at asynchronously
    void this.supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("key_hash", keyHash);

    return true;
  }
}
