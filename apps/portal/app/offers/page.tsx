import { KeyValueSummary, PageHeader, SectionGrid, SimpleList } from "../../../../packages/ui/src/react/index.tsx";
import { PortalPageShell } from "../../lib/page-shell.tsx";
import { getApplicantOffersData } from "../../lib/hiring-data.ts";

export default async function ApplicantOffersPage() {
  const offers = await getApplicantOffersData();

  return (
    <PortalPageShell activeHref="/offers" title="Offers" subtitle="Sent offers and hiring decisions">
      <PageHeader
        eyebrow="Applicant offers"
        title="Only sent offers are visible in the applicant portal."
        description="Draft compensation and internal offer preparation remain hidden until the offer is sent."
        actions={[{ label: "Back to applications", href: "/applications" }]}
      />
      <SectionGrid>
        <KeyValueSummary
          title="Offer scope"
          description="Draft offers remain internal until they are sent."
          items={[
            { label: "Visible offers", value: String(offers.length) },
            { label: "Draft offers", value: "Hidden" },
            { label: "Compensation", value: "Visible only after send" }
          ]}
          span="4"
        />
        <SimpleList
          title="Sent offers"
          description="Offer and response history remain tied to your own application."
          items={offers.map((offer) => ({
            title: offer.status.replaceAll("_", " "),
            body: JSON.stringify(offer.offerDetails),
            meta: offer.sentAt ?? offer.createdAt
          }))}
          span="8"
        />
      </SectionGrid>
    </PortalPageShell>
  );
}
