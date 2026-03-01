import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";
import { SUPABASE_CLIENT } from "../supabase/supabase.module.js";
import { CreateApiKeyDto } from "./dto/create-api-key.dto.js";

@Injectable()
export class ApiKeysService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async findAll(userId: string) {
    const { data, error } = await this.supabase
      .from("api_keys")
      .select("id, name, created_at, last_used_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async create(dto: CreateApiKeyDto, userId: string) {
    const rawKey = `lb_${randomBytes(32).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    const { data, error } = await this.supabase
      .from("api_keys")
      .insert({ user_id: userId, name: dto.name, key_hash: keyHash })
      .select("id, name, created_at, last_used_at")
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return { rawKey, ...data };
  }

  async remove(id: string, userId: string) {
    const { error } = await this.supabase
      .from("api_keys")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundException(`API key not found`);
      }
      throw new InternalServerErrorException(error.message);
    }
  }
}
