import { Ticket, Menu as MenuIcon, Gift, Sparkles, Layers, Briefcase, LogIn } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Ticket className="h-8 w-8" />
          <h1 className="text-2xl font-bold tracking-tight">
            TOTOKIT
          </h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="主菜单">
              <MenuIcon className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Gift className="mr-2 h-4 w-4" />
              <span>开奖查询</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Sparkles className="mr-2 h-4 w-4" />
              <span>热门工具</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Layers className="mr-2 h-4 w-4" />
              <span>覆盖选号</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Briefcase className="mr-2 h-4 w-4" />
              <span>我的工具箱</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogIn className="mr-2 h-4 w-4" />
              <span>登录 / 注册</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
