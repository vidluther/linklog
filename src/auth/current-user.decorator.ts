import { createParamDecorator, ExecutionContext } from "@nestjs/common";
//
export interface CurrentUserPayload {
  userId: string;
  handle: string;
}

/**
 * Extracts the authenticated user from the request.
 * Set by ApiKeyGuard after successful API key validation.
 *
 * @example
 * create(@CurrentUser() user: CurrentUserPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: CurrentUserPayload }>();
    return request.user;
  },
);
