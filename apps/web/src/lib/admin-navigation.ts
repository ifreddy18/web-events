import { CalendarDays, Building2, MapPin, LayoutDashboard } from "lucide-react";

export const adminNavigation = [
	{
		title: "Dashboard",
		href: "/admin",
		icon: LayoutDashboard,
	},
	{
		title: "Organizers",
		href: "/admin/organizers",
		icon: Building2,
	},
	{
		title: "Event Series",
		href: "/admin/event-series",
		icon: CalendarDays,
	},
	{
		title: "Locations",
		href: "/admin/locations",
		icon: MapPin,
	},
];
