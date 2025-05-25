
"use client";

import { AllHistoricalResults } from "@/components/toto/AllHistoricalResults";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function HistoricalResultsPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回主页
          </Link>
        </Button>
      </div>
      <AllHistoricalResults />
    </div>
  );
}
