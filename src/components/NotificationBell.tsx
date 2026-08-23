import { Bell } from "lucide-react";
import { useNotifications } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "@tanstack/react-router";

export function NotificationBell() {
  const { data: notifications = [], unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (n: any) => {
    if (!n.read) {
      markAsRead.mutate(n.id);
    }
    if (n.demand_id) {
      navigate({ to: "/demands" });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-primary/5"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#B94A48] text-[10px] font-bold text-white ring-2 ring-sidebar">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-4" align="end">
        <div className="flex items-center justify-between border-b p-4">
          <h4 className="text-sm font-semibold">Notificações</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 text-xs text-primary"
              onClick={() => markAllAsRead.mutate()}
            >
              Limpar todas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Bell className="mb-2 h-8 w-8 opacity-20" />
              <p className="text-xs">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "flex flex-col gap-1 border-b p-4 text-left transition-colors hover:bg-muted/50",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <p className="text-sm leading-snug">{n.message}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
