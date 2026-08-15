export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Monitor",
    items: [
      { href: "/overview", label: "Overview", icon: "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" },
      { href: "/logs", label: "Request logs", icon: "M4 6h16M4 12h16M4 18h10" },
      { href: "/audit-logs", label: "Audit logs", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z" },
    ],
  },
  {
    label: "Gateway",
    items: [
      { href: "/virtual-keys", label: "Virtual keys", icon: "M14 7a3 3 0 1 1-2.9 3.8L8 14v3H5v-3H3l4.2-4.2A3 3 0 0 1 14 7z" },
      { href: "/models", label: "Models", icon: "M12 2l9 5v10l-9 5-9-5V7z" },
      { href: "/providers", label: "Providers", icon: "M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01" },
      { href: "/projects", label: "Projects", icon: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
    ],
  },
  {
    label: "Access",
    items: [{ href: "/users-roles", label: "Users & roles", icon: "M17 20a5 5 0 0 0-10 0M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" }],
  },
  {
    label: "Develop",
    items: [{ href: "/playground", label: "Playground", icon: "M4 5h16v14H4zM8 10l3 2-3 2M13 15h4" }],
  },
];
