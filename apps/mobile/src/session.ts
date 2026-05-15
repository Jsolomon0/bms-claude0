import type { BmsMobileApiClient } from "../../../packages/api-client/src/index.ts";
import type { MobileSession, MobileSignInInput } from "../../../packages/types/src/index.ts";
import type { MobileKeyValueStorage } from "./storage.ts";

export interface MobileAuthState {
  status: "signed_out" | "restoring" | "signed_in";
  session?: MobileSession;
  errorMessage?: string;
}

export class MobileSessionController {
  private readonly apiClient: BmsMobileApiClient;
  private readonly storage: MobileKeyValueStorage;
  private readonly sessionStorageKey: string;
  private state: MobileAuthState = {
    status: "signed_out"
  };

  constructor(
    apiClient: BmsMobileApiClient,
    storage: MobileKeyValueStorage,
    options?: {
      sessionStorageKey?: string;
    }
  ) {
    this.apiClient = apiClient;
    this.storage = storage;
    this.sessionStorageKey = options?.sessionStorageKey ?? "bms.mobile.session";
  }

  getState(): MobileAuthState {
    return this.state;
  }

  async restore(): Promise<MobileAuthState> {
    this.state = {
      status: "restoring"
    };

    const token = await this.storage.getItem(this.sessionStorageKey);

    if (!token) {
      this.state = {
        status: "signed_out"
      };
      return this.state;
    }

    const session = await this.apiClient.restoreSession(token);

    if (!session) {
      await this.storage.removeItem(this.sessionStorageKey);
      this.state = {
        status: "signed_out"
      };
      return this.state;
    }

    this.state = {
      status: "signed_in",
      session
    };
    return this.state;
  }

  async signIn(input: MobileSignInInput): Promise<MobileSession> {
    const session = await this.apiClient.signIn(input);
    await this.storage.setItem(this.sessionStorageKey, session.accessToken);
    this.state = {
      status: "signed_in",
      session
    };
    return session;
  }

  async signOut(): Promise<void> {
    const token = this.state.session?.accessToken ?? (await this.storage.getItem(this.sessionStorageKey));

    if (token) {
      await this.apiClient.signOut(token);
    }

    await this.storage.removeItem(this.sessionStorageKey);
    this.state = {
      status: "signed_out"
    };
  }
}
