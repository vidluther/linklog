export interface LinkblogSuccessResponse {
  id: number;
  url: string;
  title: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

export interface LinkblogErrorResponse {
  message: string[];
  error: string;
  statusCode: number;
}

export interface SaveLinkRequest {
  type: "SAVE_LINK";
  url: string;
  title?: string;
  summary?: string;
}

export interface SaveLinkResult {
  success: boolean;
  title?: string;
  error?: string;
}

export interface ExtensionSettings {
  apiKey: string;
  apiEndpoint: string;
}

// Default endpoint placeholder — users must replace {your-username} with their actual username.
// Format: https://api.linkblog.in/{your-username}/links
export const DEFAULT_SETTINGS: ExtensionSettings = {
  apiKey: "",
  apiEndpoint: "https://api.linkblog.in/{your-username}/links",
};
