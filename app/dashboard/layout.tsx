// Dashboard layout — shared sidebar/nav wrapper for all authenticated dashboard pages
// TODO: add sidebar navigation when UI layer is built

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <section>{children}</section>;
}
