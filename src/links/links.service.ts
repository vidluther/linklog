import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "../supabase/supabase.module.js";
import { CreateLinkDto } from "./dto/create-link.dto";
import { UpdateLinkDto } from "./dto/update-link.dto";

@Injectable()
export class LinksService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async create(createLinkDto: CreateLinkDto, userId: string) {
    const { data, error } = await this.supabase
      .from("links")
      .insert({ ...createLinkDto, user_id: userId })
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async findAll(userId: string) {
    const { data, error } = await this.supabase
      .from("links")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async findOne(id: number, userId: string) {
    const { data, error } = await this.supabase
      .from("links")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundException(`Link #${id} not found`);
      }
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async update(id: number, updateLinkDto: UpdateLinkDto, userId: string) {
    const { data, error } = await this.supabase
      .from("links")
      .update({ ...updateLinkDto, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundException(`Link #${id} not found`);
      }
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async remove(id: number, userId: string) {
    const { error } = await this.supabase
      .from("links")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundException(`Link #${id} not found`);
      }
      throw new InternalServerErrorException(error.message);
    }
  }
}
