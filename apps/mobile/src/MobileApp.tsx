import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { createBmsMobileApiClient } from "../../../packages/api-client/src/index.ts";
import type {
  MobileDraftAttachment,
  MobileHomeModel,
  MobileRouteId,
  MobileSession,
  NotificationPreview,
  ProjectDetail,
  ProjectRecord
} from "../../../packages/types/src/index.ts";
import { PersistentMobileDraftStore } from "./drafts.ts";
import { MobilePushController } from "./push.ts";
import { MobileSessionController } from "./session.ts";
import { MemoryMobileKeyValueStorage } from "./storage.ts";

function SectionCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function PillButton({
  label,
  active,
  onPress
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.pillButton, active ? styles.pillButtonActive : null]}>
      <Text style={[styles.pillButtonLabel, active ? styles.pillButtonLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function ActionButton({
  label,
  tone = "primary",
  onPress
}: {
  label: string;
  tone?: "primary" | "secondary" | "ghost";
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.actionButton,
        tone === "secondary" ? styles.actionButtonSecondary : null,
        tone === "ghost" ? styles.actionButtonGhost : null
      ]}
    >
      <Text
        style={[
          styles.actionButtonLabel,
          tone === "secondary" ? styles.actionButtonLabelSecondary : null,
          tone === "ghost" ? styles.actionButtonLabelGhost : null
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function MobileApp() {
  const sessionStorage = useMemo(() => new MemoryMobileKeyValueStorage(), []);
  const draftStorage = useMemo(() => new MemoryMobileKeyValueStorage(), []);
  const apiClient = useMemo(() => createBmsMobileApiClient(), []);
  const sessionController = useMemo(() => new MobileSessionController(apiClient, sessionStorage), [apiClient, sessionStorage]);
  const draftStore = useMemo(() => new PersistentMobileDraftStore(draftStorage), [draftStorage]);
  const pushController = useMemo(() => new MobilePushController(apiClient), [apiClient]);

  const [authState, setAuthState] = useState(sessionController.getState());
  const [homeModel, setHomeModel] = useState<MobileHomeModel | undefined>();
  const [projects, setProjects] = useState<readonly ProjectRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [selectedProjectDetail, setSelectedProjectDetail] = useState<ProjectDetail | undefined>();
  const [notifications, setNotifications] = useState<readonly NotificationPreview[]>([]);
  const [invoiceSummary, setInvoiceSummary] = useState<readonly { id: string; invoiceNumber: string; balance: string; status: string }[]>([]);
  const [activeRoute, setActiveRoute] = useState<MobileRouteId>("home");
  const [draftCount, setDraftCount] = useState(0);
  const [feedback, setFeedback] = useState<string>("Mobile-ready field workflows are scoped to the signed-in role.");

  const [identifier, setIdentifier] = useState("employee@bms.local");
  const [passcode, setPasscode] = useState("111111");
  const [clockProjectId, setClockProjectId] = useState("");
  const [clockNotes, setClockNotes] = useState("");
  const [progressNote, setProgressNote] = useState("");
  const [progressAttachmentName, setProgressAttachmentName] = useState("field-photo.jpg");
  const [progressAttachmentMime, setProgressAttachmentMime] = useState("image/jpeg");
  const [progressAttachmentBytes, setProgressAttachmentBytes] = useState("2400000");
  const [requestName, setRequestName] = useState("Aria Customer");
  const [requestEmail, setRequestEmail] = useState("customer@bms.local");
  const [requestTitle, setRequestTitle] = useState("Garage conversion planning");
  const [requestSummary, setRequestSummary] = useState("Need an initial estimate and staging plan for a garage conversion.");
  const [requestPhone, setRequestPhone] = useState("555-222-1000");
  const [requestConsultationPreference, setRequestConsultationPreference] = useState("within_7_days");
  const [requestImageName, setRequestImageName] = useState("garage.jpg");
  const [requestImageMime, setRequestImageMime] = useState("image/jpeg");
  const [requestImageBytes, setRequestImageBytes] = useState("1800000");
  const [paymentCheckoutUrl, setPaymentCheckoutUrl] = useState<string | undefined>();

  async function refreshDraftCount(session?: MobileSession) {
    const actorUserId = session?.user.userId ?? authState.session?.user.userId;
    const drafts = await draftStore.listDrafts(actorUserId);
    setDraftCount(drafts.filter((draft) => draft.status === "draft" || draft.status === "failed").length);
  }

  async function refreshSessionData(session: MobileSession) {
    const workspace = await apiClient.getWorkspaceSnapshot(session);
    const notificationsFeed = await apiClient.listNotifications(session);
    const invoices = session.user.role === "customer" ? await apiClient.listInvoices(session) : [];

    setHomeModel(workspace.home);
    setProjects(workspace.projects);
    setNotifications(notificationsFeed);
    setInvoiceSummary(
      invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        balance: `${invoice.currency} ${(invoice.balanceDueCents / 100).toFixed(2)}`,
        status: invoice.status
      }))
    );

    if (session.user.role === "employee") {
      const fallbackProjectId = workspace.activeClockSession?.projectId ?? workspace.projects[0]?.id ?? "";
      setClockProjectId((currentProjectId) => currentProjectId || fallbackProjectId);
    }

    await refreshDraftCount(session);

    if (selectedProjectId) {
      setSelectedProjectDetail(await apiClient.getProjectDetail(session, selectedProjectId));
    }
  }

  useEffect(() => {
    void (async () => {
      const state = await sessionController.restore();
      setAuthState(state);

      if (state.session) {
        await refreshSessionData(state.session);
      }
    })();
  }, [sessionController]);

  async function handleSignIn() {
    try {
      const session = await sessionController.signIn({
        identifier,
        passcode
      });
      setAuthState(sessionController.getState());
      setFeedback(`Signed in as ${session.user.displayName}.`);
      setActiveRoute("home");
      await refreshSessionData(session);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to sign in.");
    }
  }

  async function handleSignOut() {
    await sessionController.signOut();
    setAuthState(sessionController.getState());
    setHomeModel(undefined);
    setProjects([]);
    setSelectedProjectId(undefined);
    setSelectedProjectDetail(undefined);
    setNotifications([]);
    setInvoiceSummary([]);
    setPaymentCheckoutUrl(undefined);
    setActiveRoute("home");
    setFeedback("Signed out.");
  }

  async function openProject(projectId: string) {
    if (!authState.session) {
      return;
    }

    const detail = await apiClient.getProjectDetail(authState.session, projectId);
    setSelectedProjectId(projectId);
    setSelectedProjectDetail(detail);
    setActiveRoute("project_detail");
  }

  async function publishProgressNow() {
    if (!authState.session || !selectedProjectId) {
      return;
    }

    const attachments: MobileDraftAttachment[] = progressAttachmentName
      ? [
          {
            localUri: `draft://${progressAttachmentName}`,
            fileName: progressAttachmentName,
            mimeType: progressAttachmentMime,
            byteSize: Number(progressAttachmentBytes),
            caption: "Field upload"
          }
        ]
      : [];

    await apiClient.submitProjectProgress(authState.session, {
      projectId: selectedProjectId,
      note: progressNote,
      visibilityFlags:
        authState.session.user.role === "subcontractor"
          ? ["internal", "subcontractor", "supercontractor"]
          : ["internal", "customer"],
      attachments
    });
    setFeedback("Progress update published from mobile.");
    setProgressNote("");
    await refreshSessionData(authState.session);
    await openProject(selectedProjectId);
  }

  async function saveProgressDraft() {
    if (!authState.session || !selectedProjectId) {
      return;
    }

    await draftStore.saveProjectProgressDraft(authState.session.user.userId, {
      projectId: selectedProjectId,
      note: progressNote,
      visibilityFlags:
        authState.session.user.role === "subcontractor"
          ? ["internal", "subcontractor", "supercontractor"]
          : ["internal", "customer"],
      attachments: progressAttachmentName
        ? [
            {
              localUri: `draft://${progressAttachmentName}`,
              fileName: progressAttachmentName,
              mimeType: progressAttachmentMime,
              byteSize: Number(progressAttachmentBytes),
              caption: "Queued field image"
            }
          ]
        : []
    });
    setFeedback("Progress draft saved for offline sync.");
    await refreshDraftCount(authState.session);
  }

  async function syncDrafts() {
    if (!authState.session) {
      return;
    }

    const results = await draftStore.syncAll(apiClient, authState.session);
    const failed = results.filter((result) => result.status === "failed").length;
    setFeedback(failed > 0 ? `${failed} draft syncs failed.` : "All pending drafts synced.");
    await refreshSessionData(authState.session);
  }

  async function submitCustomerRequestNow() {
    if (!authState.session) {
      return;
    }

    await apiClient.submitCustomerRequest(
      {
        submitterName: requestName,
        email: requestEmail,
        phone: requestPhone,
        projectTitle: requestTitle,
        projectSummary: requestSummary,
        consultationPreference: requestConsultationPreference as "asap" | "within_7_days" | "within_30_days" | "undecided",
        imageUpload: requestImageName
          ? {
              fileName: requestImageName,
              mimeType: requestImageMime,
              byteSize: Number(requestImageBytes)
            }
          : undefined
      },
      authState.session
    );
    setFeedback("Customer request submitted from mobile.");
  }

  async function saveCustomerRequestDraft() {
    if (!authState.session) {
      return;
    }

    await draftStore.saveCustomerRequestDraft(authState.session.user.userId, {
      submitterName: requestName,
      email: requestEmail,
      phone: requestPhone,
      projectTitle: requestTitle,
      projectSummary: requestSummary,
      consultationPreference: requestConsultationPreference as "asap" | "within_7_days" | "within_30_days" | "undecided",
      imageUpload: requestImageName
        ? {
            localUri: `draft://${requestImageName}`,
            fileName: requestImageName,
            mimeType: requestImageMime,
            byteSize: Number(requestImageBytes)
          }
        : undefined
    });
    setFeedback("Customer request saved as an offline draft.");
    await refreshDraftCount(authState.session);
  }

  async function clockIn() {
    if (!authState.session) {
      return;
    }

    await apiClient.clockIn(authState.session, {
      occurredAt: new Date().toISOString(),
      projectId: clockProjectId || undefined,
      notes: clockNotes
    });
    setFeedback("Clocked in from mobile.");
    await refreshSessionData(authState.session);
  }

  async function clockOut() {
    if (!authState.session) {
      return;
    }

    await apiClient.clockOut(authState.session, {
      occurredAt: new Date().toISOString(),
      projectId: clockProjectId || undefined,
      notes: clockNotes
    });
    setFeedback("Clocked out from mobile.");
    await refreshSessionData(authState.session);
  }

  async function startBreak() {
    if (!authState.session) {
      return;
    }

    await apiClient.startBreak(authState.session, {
      occurredAt: new Date().toISOString(),
      projectId: clockProjectId || undefined,
      notes: "Break started from mobile."
    });
    setFeedback("Break started.");
    await refreshSessionData(authState.session);
  }

  async function endBreak() {
    if (!authState.session) {
      return;
    }

    await apiClient.endBreak(authState.session, {
      occurredAt: new Date().toISOString(),
      projectId: clockProjectId || undefined,
      notes: "Break ended from mobile."
    });
    setFeedback("Break ended.");
    await refreshSessionData(authState.session);
  }

  async function startPayment(invoiceId: string) {
    if (!authState.session) {
      return;
    }

    const result = await apiClient.startInvoicePayment(authState.session, invoiceId);
    setPaymentCheckoutUrl(result.checkoutSession.checkoutUrl);
    setFeedback("Payment session created. Open the checkout URL in the device browser or webview.");
  }

  async function registerPushToken() {
    if (!authState.session) {
      return;
    }

    const registration = await pushController.register(authState.session, {
      token: `expo-demo-${authState.session.user.userId}`,
      platform: "ios",
      environment: "development"
    });
    setFeedback(`Push hook registered at ${registration.updatedAt}.`);
  }

  const canPublishProgress =
    authState.session?.user.role === "employee" ||
    authState.session?.user.role === "subcontractor" ||
    authState.session?.user.role === "administrator" ||
    authState.session?.user.role === "owner";
  const activeClockSession = authState.session ? apiClient.getActiveClockSession(authState.session) : undefined;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>BMS Mobile</Text>
        <Text style={styles.title}>High-frequency field work, not the whole admin suite.</Text>
        <Text style={styles.subtitle}>{feedback}</Text>

        {authState.status !== "signed_in" || !authState.session ? (
          <SectionCard title="Sign in" subtitle="Demo mobile roles use short passcodes so the auth/session flow is easy to exercise.">
            <Text style={styles.helperText}>Try `employee@bms.local / 111111`, `customer@bms.local / 222222`, or `owner@bms.local / 555555`.</Text>
            <TextInput value={identifier} onChangeText={setIdentifier} placeholder="Email" placeholderTextColor="#7f7465" style={styles.input} autoCapitalize="none" />
            <TextInput value={passcode} onChangeText={setPasscode} placeholder="Passcode" placeholderTextColor="#7f7465" style={styles.input} secureTextEntry />
            <ActionButton label="Sign in" onPress={() => void handleSignIn()} />
          </SectionCard>
        ) : (
          <>
            <SectionCard title={`${authState.session.user.displayName} (${authState.session.user.role})`} subtitle="Mobile navigation is trimmed to field tasks and stakeholder-safe actions.">
              <View style={styles.rowWrap}>
                <PillButton label="Home" active={activeRoute === "home"} onPress={() => setActiveRoute("home")} />
                {(homeModel?.actions ?? []).map((item) => (
                  <PillButton key={item.id} label={item.label} active={activeRoute === item.route} onPress={() => setActiveRoute(item.route)} />
                ))}
              </View>
              <View style={styles.rowWrap}>
                <ActionButton label={`Sync drafts (${draftCount})`} tone="secondary" onPress={() => void syncDrafts()} />
                <ActionButton label="Register push hook" tone="ghost" onPress={() => void registerPushToken()} />
                <ActionButton label="Sign out" tone="ghost" onPress={() => void handleSignOut()} />
              </View>
            </SectionCard>

            {activeRoute === "home" && homeModel ? (
              <SectionCard title={homeModel.title} subtitle={homeModel.subtitle}>
                {homeModel.cards.map((item) => (
                  <View key={item.id} style={styles.metricCard}>
                    <Text style={styles.metricTitle}>{item.title}</Text>
                    <Text style={styles.metricValue}>{item.value}</Text>
                    <Text style={styles.metricDescription}>{item.description}</Text>
                  </View>
                ))}
              </SectionCard>
            ) : null}

            {activeRoute === "projects" ? (
              <SectionCard title="Projects" subtitle="Only scoped projects appear here.">
                {projects.map((project) => (
                  <Pressable key={project.id} onPress={() => void openProject(project.id)} style={styles.listItem}>
                    <Text style={styles.listItemTitle}>{project.name}</Text>
                    <Text style={styles.listItemBody}>{project.status} | {project.visibilityFlags.join(", ")}</Text>
                  </Pressable>
                ))}
              </SectionCard>
            ) : null}

            {activeRoute === "project_detail" && selectedProjectDetail?.project ? (
              <SectionCard title={selectedProjectDetail.project.name} subtitle="Field-friendly detail with progress publishing and offline draft support.">
                <Text style={styles.detailLine}>Status: {selectedProjectDetail.project.status}</Text>
                <Text style={styles.detailLine}>Tasks visible: {selectedProjectDetail.tasks.length}</Text>
                <Text style={styles.detailLine}>Progress visible: {selectedProjectDetail.progressUpdates.length}</Text>
                {canPublishProgress ? (
                  <>
                    <TextInput value={progressNote} onChangeText={setProgressNote} placeholder="Progress note" placeholderTextColor="#7f7465" style={[styles.input, styles.multilineInput]} multiline />
                    <TextInput value={progressAttachmentName} onChangeText={setProgressAttachmentName} placeholder="Attachment file name" placeholderTextColor="#7f7465" style={styles.input} />
                    <View style={styles.row}>
                      <TextInput value={progressAttachmentMime} onChangeText={setProgressAttachmentMime} placeholder="Mime type" placeholderTextColor="#7f7465" style={[styles.input, styles.halfInput]} />
                      <TextInput value={progressAttachmentBytes} onChangeText={setProgressAttachmentBytes} placeholder="Byte size" placeholderTextColor="#7f7465" style={[styles.input, styles.halfInput]} keyboardType="numeric" />
                    </View>
                    <View style={styles.rowWrap}>
                      <ActionButton label="Publish now" onPress={() => void publishProgressNow()} />
                      <ActionButton label="Save offline draft" tone="secondary" onPress={() => void saveProgressDraft()} />
                    </View>
                  </>
                ) : null}
                {selectedProjectDetail.progressUpdates.map((update) => (
                  <View key={update.id} style={styles.subtleBlock}>
                    <Text style={styles.subtleTitle}>{update.note}</Text>
                    <Text style={styles.subtleMeta}>{update.visibilityFlags.join(", ")} | {update.createdAt.slice(0, 16).replace("T", " ")}</Text>
                  </View>
                ))}
                <ActionButton label="Back to projects" tone="ghost" onPress={() => setActiveRoute("projects")} />
              </SectionCard>
            ) : null}

            {activeRoute === "clock" && authState.session.user.role === "employee" ? (
              <SectionCard title="Clock" subtitle="Mobile clock actions stay minimal so they are fast in the field.">
                <Text style={styles.detailLine}>Current status: {activeClockSession ? "Clocked in" : "Not clocked in"}</Text>
                {activeClockSession ? <Text style={styles.detailLine}>Worked so far: {activeClockSession.workedMinutesSoFar} minutes</Text> : null}
                <TextInput value={clockProjectId} onChangeText={setClockProjectId} placeholder="Project id" placeholderTextColor="#7f7465" style={styles.input} />
                <TextInput value={clockNotes} onChangeText={setClockNotes} placeholder="Clock note" placeholderTextColor="#7f7465" style={styles.input} />
                <View style={styles.rowWrap}>
                  {!activeClockSession ? <ActionButton label="Clock in" onPress={() => void clockIn()} /> : null}
                  {activeClockSession && !activeClockSession.activeBreakStartedAt ? (
                    <ActionButton label="Start break" tone="secondary" onPress={() => void startBreak()} />
                  ) : null}
                  {activeClockSession?.activeBreakStartedAt ? (
                    <ActionButton label="End break" tone="secondary" onPress={() => void endBreak()} />
                  ) : null}
                  {activeClockSession ? <ActionButton label="Clock out" tone="ghost" onPress={() => void clockOut()} /> : null}
                </View>
              </SectionCard>
            ) : null}

            {activeRoute === "request" && authState.session.user.role === "customer" ? (
              <SectionCard title="Customer request" subtitle="The same intake model as the website, optimized for fast mobile entry.">
                <TextInput value={requestName} onChangeText={setRequestName} placeholder="Name" placeholderTextColor="#7f7465" style={styles.input} />
                <TextInput value={requestEmail} onChangeText={setRequestEmail} placeholder="Email" placeholderTextColor="#7f7465" style={styles.input} autoCapitalize="none" />
                <TextInput value={requestPhone} onChangeText={setRequestPhone} placeholder="Phone" placeholderTextColor="#7f7465" style={styles.input} />
                <TextInput value={requestTitle} onChangeText={setRequestTitle} placeholder="Project title" placeholderTextColor="#7f7465" style={styles.input} />
                <TextInput value={requestSummary} onChangeText={setRequestSummary} placeholder="Project summary" placeholderTextColor="#7f7465" style={[styles.input, styles.multilineInput]} multiline />
                <TextInput value={requestConsultationPreference} onChangeText={setRequestConsultationPreference} placeholder="Consultation preference" placeholderTextColor="#7f7465" style={styles.input} />
                <View style={styles.row}>
                  <TextInput value={requestImageName} onChangeText={setRequestImageName} placeholder="Image file name" placeholderTextColor="#7f7465" style={[styles.input, styles.halfInput]} />
                  <TextInput value={requestImageBytes} onChangeText={setRequestImageBytes} placeholder="Image bytes" placeholderTextColor="#7f7465" style={[styles.input, styles.halfInput]} keyboardType="numeric" />
                </View>
                <TextInput value={requestImageMime} onChangeText={setRequestImageMime} placeholder="Image mime type" placeholderTextColor="#7f7465" style={styles.input} />
                <View style={styles.rowWrap}>
                  <ActionButton label="Submit now" onPress={() => void submitCustomerRequestNow()} />
                  <ActionButton label="Save offline draft" tone="secondary" onPress={() => void saveCustomerRequestDraft()} />
                </View>
              </SectionCard>
            ) : null}

            {activeRoute === "invoices" && authState.session.user.role === "customer" ? (
              <SectionCard title="Invoices" subtitle="Customer payment is mobile-accessible, but still server-authorized.">
                {invoiceSummary.map((invoice) => (
                  <View key={invoice.id} style={styles.listItem}>
                    <Text style={styles.listItemTitle}>{invoice.invoiceNumber}</Text>
                    <Text style={styles.listItemBody}>{invoice.status} | {invoice.balance}</Text>
                    <ActionButton label="Start payment" tone="secondary" onPress={() => void startPayment(invoice.id)} />
                  </View>
                ))}
                {paymentCheckoutUrl ? <Text style={styles.helperText}>Checkout URL: {paymentCheckoutUrl}</Text> : null}
              </SectionCard>
            ) : null}

            {activeRoute === "notifications" ? (
              <SectionCard title="Notifications" subtitle="Push hooks and alert previews use the same scoped mobile feed.">
                {notifications.map((item) => (
                  <View key={item.id} style={styles.subtleBlock}>
                    <Text style={styles.subtleTitle}>{item.title}</Text>
                    <Text style={styles.listItemBody}>{item.body}</Text>
                    <Text style={styles.subtleMeta}>{item.timestampLabel}</Text>
                  </View>
                ))}
              </SectionCard>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4efe4"
  },
  container: {
    padding: 20,
    gap: 16
  },
  eyebrow: {
    color: "#8d5b21",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.6
  },
  title: {
    color: "#1f1b16",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34
  },
  subtitle: {
    color: "#5f5548",
    fontSize: 15,
    lineHeight: 22
  },
  card: {
    backgroundColor: "#fffaf1",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d7cdbd",
    padding: 18,
    gap: 12,
    shadowColor: "#2b241b",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#1f1b16"
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#5f5548"
  },
  row: {
    flexDirection: "row",
    gap: 10
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  pillButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#eadfcd"
  },
  pillButtonActive: {
    backgroundColor: "#2c6e5f"
  },
  pillButtonLabel: {
    color: "#3f3428",
    fontWeight: "700"
  },
  pillButtonLabelActive: {
    color: "#f8f3ea"
  },
  actionButton: {
    backgroundColor: "#8d5b21",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  actionButtonSecondary: {
    backgroundColor: "#2c6e5f"
  },
  actionButtonGhost: {
    backgroundColor: "#ede4d6"
  },
  actionButtonLabel: {
    color: "#fffaf1",
    fontWeight: "700"
  },
  actionButtonLabelSecondary: {
    color: "#fffaf1"
  },
  actionButtonLabelGhost: {
    color: "#3f3428"
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d1c5b3",
    backgroundColor: "#fdf8ef",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#1f1b16"
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top"
  },
  halfInput: {
    flex: 1
  },
  helperText: {
    color: "#5f5548",
    fontSize: 13,
    lineHeight: 18
  },
  metricCard: {
    borderRadius: 18,
    backgroundColor: "#f1e7d8",
    padding: 14,
    gap: 6
  },
  metricTitle: {
    color: "#5f5548",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.1
  },
  metricValue: {
    color: "#1f1b16",
    fontSize: 24,
    fontWeight: "800"
  },
  metricDescription: {
    color: "#4d4337",
    fontSize: 13,
    lineHeight: 18
  },
  listItem: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ded3c0",
    padding: 14,
    gap: 6,
    backgroundColor: "#fffdf7"
  },
  listItemTitle: {
    color: "#1f1b16",
    fontSize: 16,
    fontWeight: "700"
  },
  listItemBody: {
    color: "#5f5548",
    fontSize: 14,
    lineHeight: 19
  },
  detailLine: {
    color: "#3f3428",
    fontSize: 14,
    lineHeight: 20
  },
  subtleBlock: {
    borderLeftWidth: 4,
    borderLeftColor: "#2c6e5f",
    paddingLeft: 12,
    gap: 4
  },
  subtleTitle: {
    color: "#1f1b16",
    fontSize: 15,
    fontWeight: "700"
  },
  subtleMeta: {
    color: "#6f6356",
    fontSize: 12
  }
});
