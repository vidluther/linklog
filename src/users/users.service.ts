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
  username: string;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async findByUsername(username: string): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, username")
      .eq("username", username.toLowerCase())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundException(`User '${username}' not found`);
      }
      throw new InternalServerErrorException(error.message);
    }

    return data as UserProfile;
  }
}
