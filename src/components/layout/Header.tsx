
"use client";

import Link from 'next/link'; // Import Link for navigation
import { Ticket, Menu as MenuIcon, Gift, Sparkles, Layers, Briefcase, LogIn, Home } from 'lucide-react'; // Added Home icon
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

export function Header() {
  const menuItems = [
    { label: "热门工具", icon: Sparkles, action: () => console.log("热门工具 clicked") },
    { label: "覆盖选号", icon: Layers, action: () => console.log("覆盖选号 clicked") },
    { label: "我的工具箱", icon: Briefcase, action: () => console.log("我的工具箱 clicked") },
  ];

  const authItem = { label: "登录 / 注册", icon: LogIn, action: () => console.log("登录/注册 clicked") };

  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Ticket className="h-8 w-8" />
          <h1 className="text-2xl font-bold tracking-tight">
            TOTOKIT
          </h1>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="主菜单">
              <MenuIcon className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[250px] sm:w-[300px] bg-card text-card-foreground">
            <SheetHeader className="mb-6">
              <SheetTitle className="sr-only">主菜单</SheetTitle>
              <SheetDescription className="sr-only">
                选择一个选项以继续。
              </SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col space-y-2">
              {/* 首页 item - using Link */}
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-base py-3 px-4 text-foreground hover:bg-accent hover:text-accent-foreground"
                  asChild // Important for Link to work correctly with Button
                >
                  <Link href="/">
                    <Home className="mr-3 h-5 w-5 text-primary" />
                    <span>首页</span>
                  </Link>
                </Button>
              </SheetClose>

              {/* 开奖查询 item - using Link */}
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-base py-3 px-4 text-foreground hover:bg-accent hover:text-accent-foreground"
                  asChild // Important for Link to work correctly with Button
                >
                  <Link href="/historical-results">
                    <Gift className="mr-3 h-5 w-5 text-primary" />
                    <span>开奖查询</span>
                  </Link>
                </Button>
              </SheetClose>

              {menuItems.map((item, index) => (
                <SheetClose asChild key={index}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-base py-3 px-4 text-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={item.action}
                  >
                    <item.icon className="mr-3 h-5 w-5 text-primary" />
                    <span>{item.label}</span>
                  </Button>
                </SheetClose>
              ))}
              <div className="my-2 border-t border-border" /> {/* Separator */}
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-base py-3 px-4 text-foreground hover:bg-accent hover:text-accent-foreground"
                  onClick={authItem.action}
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
