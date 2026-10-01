import { Link } from "@tanstack/react-router";

// CMS-entered links can be site paths, external URLs, mailto:/tel: or "#".
// Site paths use client-side navigation; external links open in a new tab.
export function SmartLink({
  href,
  className,
  children,
  onClick,
  ...rest
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  "aria-label"?: string;
}) {
  const internal = href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/api/");
  if (internal) {
    const [beforeHash = "", hash] = href.split("#");
    const [path = "/", query] = beforeHash.split("?");
    const search = query ? Object.fromEntries(new URLSearchParams(query)) : undefined;
    return (
      <Link to={path} search={search as never} hash={hash} className={className} onClick={onClick} {...rest}>
        {children}
      </Link>
    );
  }
  const external = /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      className={className}
      onClick={onClick}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...rest}
    >
      {children}
    </a>
  );
}
