
"use client";

import Link from 'next/link';
import { Ticket, Menu as MenuIcon, Gift, Sparkles, Layers, Briefcase, LogIn, Home, ArrowLeft, ListOrdered } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

// Props are no longer needed since view switching is handled by navigation or local state
interface HeaderProps {}

export function Header({}: HeaderProps) {
  const menuItems = [
    { label: "首页", icon: Home, href: "/" },
    { label: "开奖查询", icon: Gift, href: "/historical-results" },
    { label: "数据分析", icon: ListOrdered, href: "/analytics" },
    { label: "选号工具", icon: Sparkles, action: () => console.log("选号工具 clicked") },
    { label: "覆盖选号", icon: Layers, action: () => console.log("覆盖选号 clicked") },
    { label: "我的工具箱", icon: Briefcase, action: () => console.log("我的工具箱 clicked") },
  ];

  const authItem = { label: "登录 / 注册", icon: LogIn, action: () => console.log("登录/注册 clicked") };

  const handleMenuItemClick = (itemAction?: () => void) => {
    if (itemAction) {
      itemAction();
    }
    // Add any logic to close the sheet if needed, though SheetClose asChild should handle it
  };


  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Ticket className="h-8 w-8" />
          <h1 className="text-2xl font-bold tracking-tight">
            TOTOKIT
          </h1>
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="主菜单">
              <MenuIcon className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[250px] sm:w-[300px] bg-card text-card-foreground">
            <SheetHeader className="mb-6 sr-only"> {/* Make header visually hidden */}
              <SheetTitle className="sr-only">主菜单</SheetTitle> {/* Make title visually hidden */}
              <SheetDescription className="sr-only">
                选择一个选项以继续。
              </SheetDescription> {/* Make description visually hidden */}
            </SheetHeader>
            <nav className="flex flex-col space-y-2">
              {menuItems.map((item, index) => (
                <SheetClose asChild key={item.label}>
                  {item.href ? (
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-base py-3 px-4 text-foreground hover:bg-accent hover:text-accent-foreground"
                      asChild
                    >
                      <Link href={item.href}>
                        <item.icon className="mr-3 h-5 w-5 text-primary" />
                        <span>{item.label}</span>
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-base py-3 px-4 text-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={() => handleMenuItemClick(item.action)}
                    >
                      <item.icon className="mr-3 h-5 w-5 text-primary" />
                      <span>{item.label}</span>
                    </Button>
                  )}
                </SheetClose>
              ))}
              <Separator className="my-2" />
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-base py-3 px-4 text-foreground hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleMenuItemClick(authItem.action)}
                >
                  <authItem.icon className="mr-3 h-5 w-5 text-primary" />
                  <span>{authItem.label}</span>
                </Button>
              </SheetClose>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
