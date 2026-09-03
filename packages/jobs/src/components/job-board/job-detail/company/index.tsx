import type { CompanyInfo } from '@comitium/schemas/public-jobs';
import { CompanyAvatar } from '@comitium/ui/company-avatar';
import { Link } from '@tanstack/react-router';

interface JobCompanyProps {
  companyInfo: CompanyInfo | null;
  href?: string | null;
}

export function JobCompany({ companyInfo, href = null }: JobCompanyProps) {
  const name = companyInfo?.name || 'Company';

  const content = (
    <>
      <CompanyAvatar name={companyInfo?.name} logo={companyInfo?.logo} decorative />
      <span className="text-label-16 font-medium text-foreground">{name}</span>
    </>
  );

  if (href) {
    return (
      <Link to={href} className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-80">
        {content}
      </Link>
    );
  }

  return <div className="flex items-center gap-2.5">{content}</div>;
}
