import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import type { Ticket, User } from "@shared/schema";
import { useAuthStore } from "@/store/authStore";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TicketDetailsDialogProps {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketDetailsDialog({
  ticket,
  open,
  onOpenChange,
}: TicketDetailsDialogProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isAssigning, setIsAssigning] = useState(false);

  const { data: supportUsers } = useQuery<User[]>({
    queryKey: ["/api/users/support"],
    enabled: user?.role === "ADMIN" || user?.role === "SUPPORT",
  });

  const handleAssignTicket = async (assigneeId: string) => {
    try {
      setIsAssigning(true);
      await apiRequest("PATCH", `/api/tickets/${ticket?.id}/assign`, {
        assignedToId: parseInt(assigneeId),
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Success",
        description: "Ticket assigned successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to assign ticket",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{ticket.title}</DialogTitle>
          <DialogDescription>
            Created {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="capitalize">
              Status: {ticket.status}
            </Badge>
            <Badge variant="outline" className="capitalize">
              Priority: {ticket.priority}
            </Badge>
          </div>

          <div className="prose dark:prose-invert">
            <p>{ticket.description}</p>
          </div>

          {(user?.role === "ADMIN" || user?.role === "SUPPORT") && (
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">Assign to:</p>
              <Select
                disabled={isAssigning}
                value={ticket.assignedToId?.toString()}
                onValueChange={handleAssignTicket}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {supportUsers?.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
