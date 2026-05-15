import type { BmsMobileApiClient } from "../../../packages/api-client/src/index.ts";
import type { MobilePushRegistration, MobileSession } from "../../../packages/types/src/index.ts";

export class MobilePushController {
  private readonly apiClient: BmsMobileApiClient;

  constructor(apiClient: BmsMobileApiClient) {
    this.apiClient = apiClient;
  }

  async register(
    session: MobileSession,
    input: {
      token: string;
      platform: MobilePushRegistration["platform"];
      environment: MobilePushRegistration["environment"];
    }
  ): Promise<MobilePushRegistration> {
    return this.apiClient.registerPushToken(session, input);
  }

  async listForSession(session: MobileSession): Promise<readonly MobilePushRegistration[]> {
    return this.apiClient.listPushRegistrations(session);
  }
}
