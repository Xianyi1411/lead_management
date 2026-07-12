import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import EditLeadForm from "@/components/EditLeadForm";
import { updateLead } from "../../actions";

export default async function EditLeadPage({ params }: { params: { id: string } }) {
  const user = (await getCurrentUser())!;
  const lead = await prisma.lead.findUnique({ where: { id: params.id } });

  // Same 404 for "missing" and "not yours" — don't leak which.
  if (!lead || !can(user, "edit_lead", lead)) notFound();

  return (
    <>
      <Topbar title="Edit lead" role={user.role} />
      <div className="content screen-in">
        <div style={{ marginBottom: 14 }}>
          <Link href={`/leads/${lead.id}`} className="back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="m15 18-6-6 6-6" />
            </svg>
            {lead.name}
          </Link>
        </div>
        <EditLeadForm
          lead={{
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            company: lead.company,
            source: lead.source,
            dealValue: lead.dealValue,
            notes: lead.notes,
          }}
          action={updateLead.bind(null, lead.id)}
        />
      </div>
    </>
  );
}
