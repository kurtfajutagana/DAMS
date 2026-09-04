import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { useOutletContext } from "react-router-dom";
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
import { Eye, EyeOff, Search, Filter, Edit3, ChevronLeft, ChevronRight } from "lucide-react";

export default function ManageAccounts() {
  const { selectedBranch } = useOutletContext<{ selectedBranch: string }>();
  
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUserData, setEditUserData] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Search, Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;
  
  // Form State
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "receptionist",
    branchId: "",
    licenseNumber: ""
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
        .select(`
          *,
          branches (
            branch_name
          )
        `)
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

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("is_active", true);
      if (!error && data) {
        setBranches(data);
      }
    } catch (err) {
      console.error("Failed to fetch branches", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchBranches();
  }, []);

  const handlePermissions = (name: string) => {
    toast.success(`Access permission drawer opened for ${name}.`);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/create-staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          role: formData.role,
          branch_id: formData.branchId || null
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Failed to create account");
      }
      
      toast.success("Account created successfully!");
      setIsModalOpen(false);
      setFormData({ email: "", password: "", firstName: "", lastName: "", role: "receptionist", branchId: "", licenseNumber: "" });
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/toggle-status`, {
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/delete-account`, {
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

  const handleOpenEditModal = (user: any) => {
    setEditUserData({
      id: user.id,
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      role: user.role || "receptionist",
      specialization: user.specialization || "",
      licenseNumber: user.license_number || "",
      branchId: user.branch_id || ""
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserData) return;
    
    setUsers((prevUsers: any[]) =>
      prevUsers.map((u) =>
        u.id === editUserData.id
          ? {
              ...u,
              first_name: editUserData.firstName,
              last_name: editUserData.lastName,
              role: editUserData.role,
              specialization: editUserData.specialization,
              license_number: editUserData.licenseNumber
            }
          : u
      )
    );

    toast.success(`Account details for ${editUserData.firstName} updated.`);
    setIsEditModalOpen(false);
  };

  const filteredUsers = useMemo(() => {
    const selectedBranchNormalized = selectedBranch?.trim().toLowerCase();
    const activeBranchObj = branches.find(
      (b: any) => b.branch_name?.trim().toLowerCase() === selectedBranchNormalized
    );
    const activeBranchId = activeBranchObj?.id;

    return users.filter((u: any) => {
      const fullName = `${u.first_name || ''} ${u.last_name || ''} ${u.email || ''} ${u.id || ''}`.toLowerCase();
      const matchesSearch = fullName.includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role?.toLowerCase() === roleFilter.toLowerCase();

      const userBranchObj = Array.isArray(u.branches) ? u.branches[0] : u.branches;
      const userBranchName = userBranchObj?.branch_name?.trim().toLowerCase() || "";

      const matchesBranch =
        selectedBranch === "All Branches" ||
        u.role?.toLowerCase() === "admin" ||
        (activeBranchId && u.branch_id === activeBranchId) ||
        (userBranchName && userBranchName === selectedBranchNormalized);

      return matchesSearch && matchesRole && matchesBranch;
    });
  }, [users, branches, searchQuery, roleFilter, selectedBranch]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, selectedBranch]);

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-955">Manage Accounts</h1>
          <p className="text-slate-500 text-sm mt-1">Control accounts, permissions, and doctor licenses</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-slate-950 hover:bg-slate-900 text-white font-semibold text-sm h-10 px-5"
            >
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <form onSubmit={handleCreateStaff}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-950">Add New Account</DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
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
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
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
                {formData.role === "dentist" && (
                  <div className="grid gap-2">
                    <Label htmlFor="licenseNumber">Dental License Number <span className="text-red-500">*</span></Label>
                    <Input
                      id="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
                      placeholder="PRC Lic #123456"
                      required
                    />
                  </div>
                )}
                {(formData.role === "receptionist" || formData.role === "dentist") && (
                  <div className="grid gap-2">
                    <Label htmlFor="branch">Assign Branch <span className="text-red-500">*</span></Label>
                    <Select value={formData.branchId} onValueChange={(val) => setFormData({...formData, branchId: val})} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="text-sm font-semibold">
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating} className="text-sm font-semibold bg-slate-950 hover:bg-slate-900 text-white">
                  {isCreating ? "Creating..." : "Create Account"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>

      {/* Edit Account Modal */}
      {isEditModalOpen && editUserData && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <form onSubmit={handleSaveEditUser}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-955">Edit Staff Account</DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Update operator credentials and license permissions.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="editFirstName">First Name</Label>
                    <Input
                      id="editFirstName"
                      value={editUserData.firstName}
                      onChange={(e) => setEditUserData({...editUserData, firstName: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editLastName">Last Name</Label>
                    <Input
                      id="editLastName"
                      value={editUserData.lastName}
                      onChange={(e) => setEditUserData({...editUserData, lastName: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editRole">Role</Label>
                  <Select value={editUserData.role} onValueChange={(val) => setEditUserData({...editUserData, role: val})}>
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
                {editUserData.role === "dentist" && (
                  <div className="grid gap-2">
                    <Label htmlFor="editLicenseNumber">Dental License Number</Label>
                    <Input
                      id="editLicenseNumber"
                      value={editUserData.licenseNumber}
                      onChange={(e) => setEditUserData({...editUserData, licenseNumber: e.target.value})}
                      placeholder="PRC Lic #123456"
                    />
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="text-sm font-semibold">
                  Cancel
                </Button>
                <Button type="submit" className="text-sm font-semibold bg-slate-950 hover:bg-slate-900 text-white">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Grid */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Account Register</h2>
            <p className="text-xs text-slate-500">Authorized personnel credentials</p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, ID, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/20 focus:border-slate-900 transition-colors"
              />
            </div>
            
            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="py-2 pl-3 pr-8 border border-slate-300 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/20 focus:border-slate-900 transition-colors appearance-none"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admins</option>
                <option value="dentist">Dentists</option>
                <option value="receptionist">Receptionists</option>
              </select>
            </div>

            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="text-xs font-semibold h-9 px-3 border-slate-300">
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Account ID</th>
                <th className="py-3.5 px-4">Operator Name</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Branch / Specialization</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Verified</th>
                <th className="py-3.5 px-4 text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 animate-pulse text-sm">
                    Loading staff accounts...
                  </td>
                </tr>
              )}
              {!loading && paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-sm font-medium">
                    No matching staff accounts found for this role or filter.
                  </td>
                </tr>
              )}
              {paginatedUsers.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-500">
                    {u.id.substring(0, 8)}...
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-955 text-sm">{u.first_name} {u.last_name}</div>
                    <div className="text-xs text-slate-500">Since {new Date(u.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    {u.role === "admin" && (
                      <Badge className="bg-slate-950 text-white border border-slate-950 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase">
                        Admin
                      </Badge>
                    )}
                    {u.role === "dentist" && (
                      <Badge className="bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase">
                        Dentist
                      </Badge>
                    )}
                    {u.role === "receptionist" && (
                      <Badge className="bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase">
                        Receptionist
                      </Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-800 font-semibold text-sm">
                      {(() => {
                        const bObj = Array.isArray(u.branches) ? u.branches[0] : u.branches;
                        const bName = bObj?.branch_name || branches.find((b: any) => b.id === u.branch_id)?.branch_name;
                        return bName ? `📍 ${bName}` : (u.specialization || "General Access");
                      })()}
                    </div>
                    {u.license_number && (
                      <div className="text-xs text-slate-500 mt-0.5">Lic: {u.license_number}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {u.is_active ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase hover:bg-emerald-100">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase hover:bg-rose-100">
                        Disabled
                      </Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {u.is_email_verified ? (
                      <span className="text-emerald-700 font-bold text-sm">Yes</span>
                    ) : (
                      <span className="text-amber-600 font-bold text-sm">No</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        onClick={() => handleOpenEditModal(u)}
                        size="sm"
                        variant="outline"
                        className="h-8 border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs px-2.5"
                      >
                        <Edit3 className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleToggleStatus(u.id, u.is_active)}
                        size="sm"
                        variant="outline"
                        disabled={u.id === currentUserId}
                        className="h-8 border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold text-xs px-2.5 disabled:opacity-50"
                      >
                        {u.is_active ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        onClick={() => handleDeleteAccount(u.id)}
                        size="sm"
                        variant="outline"
                        disabled={u.id === currentUserId}
                        className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold text-xs px-2.5 disabled:opacity-50 disabled:hover:bg-transparent"
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

        {/* Pagination Footer Controls */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredUsers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} accounts
          </span>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-8 border-slate-300 text-xs font-semibold disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <span className="text-xs font-bold text-slate-700 px-2">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-8 border-slate-300 text-xs font-semibold disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

      </Card>
    </div>
  );
}
