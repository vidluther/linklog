import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "../supabase/supabase.module.js";

export interface UserProfile {
  id: string;
  handle: string;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async findByHandle(handle: string): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, handle")
      .eq("handle", handle.toLowerCase())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundException(`User '${handle}' not found`);
      }
      throw new InternalServerErrorException(error.message);
    }

    return data as UserProfile;
  }
}
