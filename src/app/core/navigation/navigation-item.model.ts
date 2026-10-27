export interface NavigationItem {
  id: number;
  code: string;
  label: string;
  route: string | null;
  icon: string | null;
  order: number;
  children: readonly NavigationItem[];
}

export interface BreadcrumbItem {
  label: string;
  url: string;
}
