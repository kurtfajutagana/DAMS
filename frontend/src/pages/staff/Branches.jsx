import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Building2, Phone, MapPin, Users, HeartPulse } from "lucide-react";

export default function Branches() {
  const branchesList = [
    {
      id: 1,
      name: "TeethTalk - Pasig (Main)",
      address: "123 Sixto Antonio Ave, Pasig, Metro Manila",
      phone: "+63 917 123 4567",
      dentists: 4,
      load: "High",
      status: "Open"
    },
    {
      id: 2,
      name: "TeethTalk - Makati",
      address: "456 Chino Roces Ave, Makati, Metro Manila",
      phone: "+63 917 765 4321",
      dentists: 3,
      load: "Medium",
      status: "Open"
    },
    {
      id: 3,
      name: "TeethTalk - Quezon City",
      address: "789 Katipunan Ave, Quezon City, Metro Manila",
      phone: "+63 918 999 8888",
      dentists: 5,
      load: "Low",
      status: "Open"
    }
  ];

  const getLoadBadge = (load) => {
    switch (load) {
      case "High":
        return <Badge className="bg-red-500 text-white rounded-full">High Traffic</Badge>;
      case "Medium":
        return <Badge className="bg-amber-500 text-white rounded-full">Medium Traffic</Badge>;
      case "Low":
        return <Badge className="bg-emerald-500 text-white rounded-full">Normal</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Clinic Branches</h1>
        <p className="text-slate-500 text-sm">Monitor clinic branches, status, and active queue volumes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {branchesList.map((branch) => (
          <Card key={branch.id} className="border-none shadow-xl shadow-slate-100/50 bg-white rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-300">
            <div className="h-2 bg-red-600"></div>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-800">{branch.name}</h3>
                </div>
                <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full">{branch.status}</Badge>
              </div>

              <div className="space-y-3 pt-2 text-sm text-slate-600">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{branch.address}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{branch.phone}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <HeartPulse className="h-4 w-4 text-slate-400" />
                  <span>{branch.dentists} Dentists</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span>{getLoadBadge(branch.load)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
