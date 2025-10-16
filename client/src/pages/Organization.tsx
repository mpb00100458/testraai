import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Users, UserPlus, Pencil, Trash2, MoreVertical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrganizationSchema, type InsertOrganization, type Organization, type Membership, type User } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";
import { z } from "zod";

interface MembershipWithUser extends Membership {
  user: User;
}

const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(['OWNER', 'ADMIN', 'DEV', 'VIEWER']),
});

type InviteMemberForm = z.infer<typeof inviteMemberSchema>;

export default function OrganizationPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [editOrgOpen, setEditOrgOpen] = useState(false);
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: organizations, isLoading: orgsLoading } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
    enabled: isAuthenticated,
  });

  const { data: members, isLoading: membersLoading } = useQuery<MembershipWithUser[]>({
    queryKey: ["/api/organizations/members"],
    enabled: isAuthenticated,
  });

  const orgForm = useForm<InsertOrganization>({
    resolver: zodResolver(insertOrganizationSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const editOrgForm = useForm<InsertOrganization>({
    resolver: zodResolver(insertOrganizationSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const inviteForm = useForm<InviteMemberForm>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role: "VIEWER",
    },
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data: InsertOrganization) => {
      await apiRequest("POST", "/api/organizations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({
        title: "Success",
        description: "Workspace created successfully",
      });
      setCreateOrgOpen(false);
      orgForm.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create workspace",
        variant: "destructive",
      });
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertOrganization }) => {
      await apiRequest("PATCH", `/api/organizations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({
        title: "Success",
        description: "Workspace updated successfully",
      });
      setEditOrgOpen(false);
      setSelectedOrg(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update workspace",
        variant: "destructive",
      });
    },
  });

  const deleteOrgMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/organizations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({
        title: "Success",
        description: "Workspace deleted successfully",
      });
      setDeleteOrgId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete workspace",
        variant: "destructive",
      });
    },
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async (data: InviteMemberForm) => {
      if (!organizations || organizations.length === 0) return;
      await apiRequest("POST", `/api/organizations/${organizations[0].id}/members`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/members"] });
      toast({
        title: "Success",
        description: "Member invited successfully",
      });
      setInviteMemberOpen(false);
      inviteForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to invite member",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      await apiRequest("PATCH", `/api/memberships/${id}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/members"] });
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/memberships/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/members"] });
      toast({
        title: "Success",
        description: "Member removed successfully",
      });
      setRemoveMemberId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    },
  });

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const roleColors: Record<string, string> = {
    OWNER: "bg-primary/10 text-primary border-primary/20",
    ADMIN: "bg-success/10 text-success border-success/20",
    DEV: "bg-warning/10 text-warning border-warning/20",
    VIEWER: "bg-muted text-muted-foreground border-border",
  };

  const handleEditOrg = (org: Organization) => {
    setSelectedOrg(org);
    editOrgForm.reset({
      name: org.name,
      slug: org.slug,
    });
    setEditOrgOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workspace</h1>
          <p className="text-muted-foreground">Manage your workspace and team members</p>
        </div>
        <Button onClick={() => setCreateOrgOpen(true)} data-testid="button-create-organization">
          <Building2 className="h-4 w-4 mr-2" />
          New Workspace
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Workspaces</CardTitle>
                <CardDescription>Workspaces you belong to</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {orgsLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : organizations && organizations.length > 0 ? (
              <div className="space-y-3">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center gap-3 p-3 rounded-md border border-border hover-elevate"
                    data-testid={`org-item-${org.id}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{org.name}</div>
                      <div className="text-sm text-muted-foreground">/{org.slug}</div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-org-menu-${org.id}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditOrg(org)} data-testid={`button-edit-org-${org.id}`}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteOrgId(org.id)}
                          className="text-destructive"
                          data-testid={`button-delete-org-${org.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No workspaces yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Assign users to workspace</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setInviteMemberOpen(true)} data-testid="button-invite-member">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : members && members.length > 0 ? (
              <div className="space-y-3">
                {members.map((membership) => (
                  <div
                    key={membership.id}
                    className="flex items-center gap-3 p-3 rounded-md border border-border"
                    data-testid={`member-item-${membership.id}`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={membership.user.profileImageUrl || undefined} className="object-cover" />
                      <AvatarFallback>{membership.user.firstName?.[0] || membership.user.email?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {membership.user.firstName && membership.user.lastName
                          ? `${membership.user.firstName} ${membership.user.lastName}`
                          : membership.user.email}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{membership.user.email}</div>
                    </div>
                    <Select
                      value={membership.role}
                      onValueChange={(role) => updateRoleMutation.mutate({ id: membership.id, role })}
                    >
                      <SelectTrigger className="w-32" data-testid={`select-role-${membership.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OWNER">Owner</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="DEV">Dev</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setRemoveMemberId(membership.id)}
                      data-testid={`button-remove-member-${membership.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No team members</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Workspace Dialog */}
      <Dialog open={createOrgOpen} onOpenChange={setCreateOrgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace for your team
            </DialogDescription>
          </DialogHeader>
          <Form {...orgForm}>
            <form onSubmit={orgForm.handleSubmit((data) => createOrgMutation.mutate(data))} className="space-y-4">
              <FormField
                control={orgForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workspace Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Team" {...field} data-testid="input-org-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={orgForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workspace URL</FormLabel>
                    <FormControl>
                      <Input placeholder="my-team" {...field} data-testid="input-org-slug" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createOrgMutation.isPending} data-testid="button-submit-organization">
                  {createOrgMutation.isPending ? "Creating..." : "Create Workspace"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Workspace Dialog */}
      <Dialog open={editOrgOpen} onOpenChange={setEditOrgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workspace</DialogTitle>
            <DialogDescription>
              Update your workspace details
            </DialogDescription>
          </DialogHeader>
          <Form {...editOrgForm}>
            <form onSubmit={editOrgForm.handleSubmit((data) => {
              if (selectedOrg) {
                updateOrgMutation.mutate({ id: selectedOrg.id, data });
              }
            })} className="space-y-4">
              <FormField
                control={editOrgForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workspace Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Team" {...field} data-testid="input-edit-org-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editOrgForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workspace URL</FormLabel>
                    <FormControl>
                      <Input placeholder="my-team" {...field} data-testid="input-edit-org-slug" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateOrgMutation.isPending} data-testid="button-submit-edit-organization">
                  {updateOrgMutation.isPending ? "Updating..." : "Update Workspace"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={inviteMemberOpen} onOpenChange={setInviteMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Assign a user to your workspace
            </DialogDescription>
          </DialogHeader>
          <Form {...inviteForm}>
            <form onSubmit={inviteForm.handleSubmit((data) => inviteMemberMutation.mutate(data))} className="space-y-4">
              <FormField
                control={inviteForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="user@example.com" {...field} data-testid="input-member-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={inviteForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-member-role">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OWNER">Owner</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="DEV">Dev</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={inviteMemberMutation.isPending} data-testid="button-submit-invite">
                  {inviteMemberMutation.isPending ? "Adding..." : "Add Member"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Confirmation */}
      <AlertDialog open={!!deleteOrgId} onOpenChange={(open) => !open && setDeleteOrgId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the workspace and all associated projects, estates, and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-org">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteOrgId && deleteOrgMutation.mutate(deleteOrgId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-org"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!removeMemberId} onOpenChange={(open) => !open && setRemoveMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the member from the workspace. They will lose access to all projects and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove-member">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMemberId && removeMemberMutation.mutate(removeMemberId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-remove-member"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
