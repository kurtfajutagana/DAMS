import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Eye, EyeOff, Search, Filter } from "lucide-react";

export default function ManageAccounts() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  
  // Form State
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "receptionist"
  });
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      setCurrentUserId(authData?.user?.id || null);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["receptionist", "dentist", "admin"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load staff accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePermissions = (name: string) => {
    toast.success(`Access permission drawer opened for ${name}.`);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    
    try {
      const response = await fetch("http://localhost:8000/api/auth/create-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          role: formData.role
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Failed to create account");
      }
      
      toast.success("Account created successfully!");
      setIsModalOpen(false);
      setFormData({ email: "", password: "", firstName: "", lastName: "", role: "receptionist" });
      fetchUsers(); // Refresh the list
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const res = await fetch("http://localhost:8000/api/auth/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, is_active: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update status");
      toast.success(`Account ${newStatus ? 'enabled' : 'disabled'} successfully.`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteAccount = async (userId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this account? This cannot be undone.")) return;
    try {
      const res = await fetch("http://localhost:8000/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to delete account");
      toast.success("Account permanently deleted.");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manage Accounts</h1>
          <p className="text-slate-500 text-xs mt-0.5">Control accounts, permissions, and doctor licenses</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs"
            >
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCreateStaff}>
              <DialogHeader>
                <DialogTitle>Add New Account</DialogTitle>
                <DialogDescription>
                  Create a new admin, receptionist or dentist account. An email verification will be automatically processed.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      placeholder="Juan"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      placeholder="Dela Cruz"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="staff@teethtalk.com"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="Create a secure password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">System Admin</SelectItem>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                      <SelectItem value="dentist">Dentist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Account"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>

      {/* Grid */}
      <Card className="border-slate-200 bg-white">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/40">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Account Register</h2>
            <p className="text-[10px] text-slate-500">Authorized personnel credentials</p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, ID, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            
            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="py-1.5 pl-2 pr-8 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 appearance-none"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admins</option>
                <option value="dentist">Dentists</option>
                <option value="receptionist">Receptionists</option>
              </select>
            </div>

            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="text-xs h-7 ml-2">
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Account ID</th>
                <th className="py-3 px-4">Operator Name</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Branch / Specialization</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Verified</th>
                <th className="py-3 px-4 text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-650">
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No accounts found. Create one to get started.
                  </td>
                </tr>
              )}
              {loading && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 animate-pulse">
                    Loading accounts...
                  </td>
                </tr>
              )}
              {users
                .filter((u: any) => {
                  const matchesSearch = `${u.first_name} ${u.last_name} ${u.id}`.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesRole = roleFilter === "all" || u.role === roleFilter;
                  return matchesSearch && matchesRole;
                })
                .map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-400">
                    {u.id.substring(0, 8)}...
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-950">{u.first_name} {u.last_name}</div>
                    <div className="text-[10px] text-slate-400">Since {new Date(u.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="py-3 px-4">
                    {u.role === "admin" && (
                      <Badge className="bg-slate-950 text-white border border-slate-950 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                        Admin
                      </Badge>
                    )}
                    {u.role === "dentist" && (
                      <Badge className="bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                        Dentist
                      </Badge>
                    )}
                    {u.role === "receptionist" && (
                      <Badge className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                        Receptionist
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-800 font-medium">{u.specialization || "General Access"}</div>
                    {u.license_number && (
                      <div className="text-[9px] text-slate-400 mt-0.5">Lic: {u.license_number}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {u.is_active ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase hover:bg-emerald-100">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase hover:bg-rose-100">
                        Disabled
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {u.is_email_verified ? (
                      <span className="text-emerald-600 font-bold text-xs">Yes</span>
                    ) : (
                      <span className="text-amber-500 font-bold text-xs">No</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        onClick={() => handleToggleStatus(u.id, u.is_active)}
                        size="sm"
                        variant="outline"
                        disabled={u.id === currentUserId}
                        className="h-7 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-[10px] disabled:opacity-50"
                      >
                        {u.is_active ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        onClick={() => handleDeleteAccount(u.id)}
                        size="sm"
                        variant="outline"
                        disabled={u.id === currentUserId}
                        className="h-7 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold text-[10px] disabled:opacity-50 disabled:hover:bg-transparent"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
