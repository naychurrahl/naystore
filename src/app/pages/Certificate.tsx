import { Link, useParams } from "react-router";
import { Award, BadgeCheck, Download, ShieldAlert } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import "./certificate.css";

interface CertificateData {
  code: string;
  learnerName: string;
  courseName: string;
  issuerName: string;
  issuedAt: string;
  productId: string | null;
  valid: boolean;
}

// 12-character codes are shown in groups of four: ABCD-EFGH-JKLM.
const formatCode = (code: string) => code.match(/.{1,4}/g)?.join("-") ?? code;

// Public certificate page - what learners download (the browser's "Save as
// PDF" from the print dialog, laid out for one A4 landscape page) and what
// anyone checks a certificate against. Sits outside the shop layout so the
// printout is just the certificate.
export function Certificate() {
  const { code = "" } = useParams();
  const { data, loading, error } = useAPI(`${API_BASE}/certificates/${encodeURIComponent(code)}`);
  const cert = data as CertificateData | null;

  if (loading) {
    return <div className="cert-screen"><p style={{ color: 'var(--color-text-secondary)' }}>Checking certificate…</p></div>;
  }

  if (error || !cert) {
    return (
      <div className="cert-screen">
        <div className="text-center max-w-md">
          <ShieldAlert className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--color-error)' }} />
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Certificate not found</h1>
          <p className="mb-5" style={{ color: 'var(--color-text-secondary)' }}>
            No certificate has the code <strong>{formatCode(code.toUpperCase())}</strong>. Check the code and try again.
          </p>
          <Link to="/" className="font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>Go to the store</Link>
        </div>
      </div>
    );
  }

  const issued = new Date(cert.issuedAt.replace(" ", "T")).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const verifyUrl = `${window.location.origin}/certificates/${cert.code}`;

  return (
    <div className="cert-screen">
      <div className="w-full max-w-4xl">
        <div className="cert-toolbar flex flex-wrap items-center justify-between gap-3 mb-4">
          {cert.valid ? (
            <p className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-success)' }}>
              <BadgeCheck className="h-5 w-5" /> Verified certificate, issued {issued}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-error)' }}>
              <ShieldAlert className="h-5 w-5" /> This certificate is no longer valid (the enrolment was cancelled or refunded).
            </p>
          )}
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm hover:underline" style={{ color: 'var(--color-text-secondary)' }}>Store</Link>
            {cert.valid && (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                title="Opens the print dialog - choose “Save as PDF”"
              >
                <Download className="h-4 w-4" /> Download PDF
              </button>
            )}
          </div>
        </div>

        <article className={`cert-sheet${cert.valid ? "" : " cert-void"}`} aria-label="Certificate of completion">
          <div className="cert-frame">
            <Award className="cert-seal" aria-hidden="true" />
            <p className="cert-kicker">Certificate of Completion</p>
            <p className="cert-small">This certifies that</p>
            <p className="cert-name">{cert.learnerName}</p>
            <p className="cert-small">has successfully completed the course</p>
            <p className="cert-course">{cert.courseName}</p>
            <div className="cert-footer">
              <div>
                <p className="cert-label">Issued by</p>
                <p className="cert-value">{cert.issuerName}</p>
              </div>
              <div>
                <p className="cert-label">Date</p>
                <p className="cert-value">{issued}</p>
              </div>
              <div>
                <p className="cert-label">Certificate ID</p>
                <p className="cert-value cert-mono">{formatCode(cert.code)}</p>
              </div>
            </div>
            <p className="cert-verify">Verify at {verifyUrl}</p>
          </div>
        </article>
      </div>
    </div>
  );
}
