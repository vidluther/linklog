import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { SupabaseModule } from "./supabase/supabase.module.js";
import { LinksModule } from "./links/links.module";
import { FeedModule } from "./feed/feed.module";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { UsersModule } from "./users/users.module.js";
import { ApiKeysModule } from "./api-keys/api-keys.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== "production"
            ? { target: "pino-pretty", options: { singleLine: true } }
            : undefined,
        customLogLevel: (_req, res, _err) => {
          if (res.statusCode >= 500) return "error";
          if (res.statusCode >= 400) return "warn";
          return "info";
        },
        serializers: {
          req(req: Record<string, unknown>) {
            return {
              id: req["id"],
              method: req["method"],
              url: req["url"],
              query: req["query"],
              params: req["params"],
              body: req["body"],
              headers: req["headers"],
              remoteAddress: (req["socket"] as Record<string, unknown>)?.[
                "remoteAddress"
              ],
              remotePort: (req["socket"] as Record<string, unknown>)?.[
                "remotePort"
              ],
            };
          },
        },
      },
    }),
    SupabaseModule,
    AuthModule,
    UsersModule,
    ApiKeysModule,
    LinksModule,
    FeedModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
