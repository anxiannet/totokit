import { Ticket, Menu as MenuIcon, Gift, Sparkles, Layers, Briefcase, LogIn } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose, // Added for explicit close button if needed
} from "@/components/ui/sheet";
import Link from 'next/link'; // For potential navigation

export function Header() {
  const menuItems = [
    { label: "开奖查询", icon: Gift, href: "#" },
    { label: "热门工具", icon: Sparkles, href: "#" },
    { label: "覆盖选号", icon: Layers, href: "#" },
    { label: "我的工具箱", icon: Briefcase, href: "#" },
  ];

  const authItem = { label: "登录 / 注册", icon: LogIn, href: "#" };

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
          <SheetContent side="right" className="w-[250px] sm:w-[300px]">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-primary">菜单</SheetTitle>
              {/* <SheetDescription>
                选择一个选项以继续。
              </SheetDescription> */}
            </SheetHeader>
            <nav className="flex flex-col space-y-2">
              {menuItems.map((item, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full justify-start text-base py-3 px-4 text-foreground hover:bg-accent hover:text-accent-foreground"
                  asChild
                >
                  {/* In a real app, Link would navigate. For now, it's a placeholder. */}
                  <Link href={item.href}>
                    <item.icon className="mr-3 h-5 w-5 text-primary" />
                    <span>{item.label}</span>
                  </Link>
                </Button>
              ))}
              <div className="my-2 border-t border-border" /> {/* Separator */}
              <Button
                variant="ghost"
                className="w-full justify-start text-base py-3 px-4 text-foreground hover:bg-accent hover:text-accent-foreground"
                asChild
              >
                <Link href={authItem.href}>
                  <authItem.icon className="mr-3 h-5 w-5 text-primary" />
                  <span>{authItem.label}</span>
                </Link>
              </Button>
            </nav>
            {/* SheetClose is automatically added by SheetContent but can be customized */}
            {/* <SheetFooter className="mt-auto">
              <SheetClose asChild>
                <Button type="submit">关闭</Button>
              </SheetClose>
            </SheetFooter> */}
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
