"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Trash2, ListChecks, Search, CheckCircle2, XCircle } from "lucide-react";
import type { UserTicket, TotoCombination, HistoricalResult } from "@/lib/types";
import { MOCK_LATEST_RESULT, TOTO_COMBINATION_LENGTH, TOTO_NUMBER_RANGE } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const latestResult: HistoricalResult = MOCK_LATEST_RESULT; // Use mock data for now

interface WinningGroup {
  group: number;
  prize: string; // Keep prize in English for now as it's complex to translate dynamically here
  matchedNumbers: number;
  matchedAdditional: boolean;
}

// Simplified prize groups for demonstration
const PRIZE_GROUPS = [
  { group: 1, prize: "Group 1 Prize (Jackpot)", match: 6, additional: false },
  { group: 2, prize: "Group 2 Prize", match: 5, additional: true },
  { group: 3, prize: "Group 3 Prize", match: 5, additional: false },
  { group: 4, prize: "Group 4 Prize", match: 4, additional: true },
  { group: 5, prize: "Group 5 Prize", match: 4, additional: false },
  { group: 6, prize: "Group 6 Prize", match: 3, additional: true },
  { group: 7, prize: "Group 7 Prize", match: 3, additional: false },
];

const checkWin = (ticketNumbers: TotoCombination, officialResult: HistoricalResult): WinningGroup | null => {
  const matchedMainNumbers = ticketNumbers.filter(num => officialResult.numbers.includes(num)).length;
  const matchedAdditionalNumber = ticketNumbers.includes(officialResult.additionalNumber);

  for (const prize of PRIZE_GROUPS) {
    if (prize.additional) {
      if (matchedMainNumbers === prize.match && matchedAdditionalNumber) {
        return { group: prize.group, prize: prize.prize, matchedNumbers: matchedMainNumbers, matchedAdditional: true };
      }
    } else {
      if (matchedMainNumbers === prize.match && (!prize.additional || matchedAdditionalNumber || !officialResult.numbers.some(n => ticketNumbers.includes(n)))) {
        if (prize.group === 3 && matchedMainNumbers === 5) return { group: prize.group, prize: prize.prize, matchedNumbers: matchedMainNumbers, matchedAdditional: matchedAdditionalNumber };
        if (prize.group === 5 && matchedMainNumbers === 4) return { group: prize.group, prize: prize.prize, matchedNumbers: matchedMainNumbers, matchedAdditional: matchedAdditionalNumber };
        if (prize.group === 7 && matchedMainNumbers === 3) return { group: prize.group, prize: prize.prize, matchedNumbers: matchedMainNumbers, matchedAdditional: matchedAdditionalNumber };
      }
    }
  }
  if (matchedMainNumbers === 6) return { group: 1, prize: "Group 1 Prize (Jackpot)", matchedNumbers: 6, matchedAdditional: false};

  return null;
};


export function WinChecker() {
  const { toast } = useToast();
  const [userTickets, setUserTickets] = useState<UserTicket[]>([]);
  const [currentTicketInput, setCurrentTicketInput] = useState<string>("");
  const [checkedTickets, setCheckedTickets] = useState<Array<UserTicket & { win?: WinningGroup | null }>>([]);

  const handleAddTicket = (event?: FormEvent) => {
    event?.preventDefault();
    const numbers = currentTicketInput
      .split(/[,.\s，．\s]+/) // Added Chinese commas
      .map(n => parseInt(n.trim(), 10))
      .filter(n => !isNaN(n) && n >= TOTO_NUMBER_RANGE.min && n <= TOTO_NUMBER_RANGE.max);

    if (numbers.length !== TOTO_COMBINATION_LENGTH) {
      toast({
        title: "无效彩票",
        description: `请输入 ${TOTO_COMBINATION_LENGTH} 个介于 ${TOTO_NUMBER_RANGE.min} 和 ${TOTO_NUMBER_RANGE.max} 之间的号码。`,
        variant: "destructive",
      });
      return;
    }
    if (new Set(numbers).size !== TOTO_COMBINATION_LENGTH) {
      toast({
        title: "无效彩票",
        description: "彩票中不允许出现重复号码。",
        variant: "destructive",
      });
      return;
    }

    setUserTickets([...userTickets, { id: crypto.randomUUID(), numbers }]);
    setCurrentTicketInput("");
  };

  const handleRemoveTicket = (id: string) => {
    setUserTickets(userTickets.filter(t => t.id !== id));
    setCheckedTickets(checkedTickets.filter(t => t.id !== id));
  };

  const handleCheckAllTickets = () => {
    if(userTickets.length === 0) {
      toast({
        title: "没有彩票",
        description: "请先添加一些彩票。",
        variant: "default"
      });
      return;
    }
    const results = userTickets.map(ticket => ({
      ...ticket,
      win: checkWin(ticket.numbers, latestResult),
    }));
    setCheckedTickets(results);
    toast({
      title: "已检查彩票",
      description: `已根据第 ${latestResult.drawNumber} 期开奖结果检查了 ${results.length} 张彩票。`,
    });
  };
  
  const getBallColor = (number: number, isWinning: boolean, isAdditional: boolean = false): string => {
    if (!isWinning) return "bg-muted text-muted-foreground"; 
    if (isAdditional) return "bg-destructive text-white"; 
    
    if (number >= 1 && number <= 9) return "bg-red-500 text-white";
    if (number >= 10 && number <= 19) return "bg-blue-500 text-white";
    if (number >= 20 && number <= 29) return "bg-green-500 text-white";
    if (number >= 30 && number <= 39) return "bg-yellow-500 text-black";
    if (number >= 40 && number <= 49) return "bg-purple-500 text-white";
    return "bg-gray-500 text-white";
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-primary" />
          检查您的彩票
        </CardTitle>
        <CardDescription>
          输入您的TOTO彩票号码，并根据第 {latestResult.drawNumber} 期官方结果进行检查。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAddTicket} className="flex items-end gap-2">
          <div className="flex-grow">
            <Label htmlFor="ticketInput">输入彩票号码（逗号分隔）</Label>
            <Input
              id="ticketInput"
              value={currentTicketInput}
              onChange={(e) => setCurrentTicketInput(e.target.value)}
              placeholder="例如：1, 2, 3, 4, 5, 6"
            />
          </div>
          <Button type="submit" variant="outline" size="icon" aria-label="添加彩票">
            <PlusCircle className="h-5 w-5" />
          </Button>
        </form>

        {userTickets.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">您的彩票：</h3>
            <ScrollArea className="h-[150px] rounded-md border p-2">
              <ul className="space-y-2">
                {userTickets.map((ticket) => (
                  <li key={ticket.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                    <span className="font-mono text-sm">{ticket.numbers.join(", ")}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTicket(ticket.id)}
                      aria-label="移除彩票"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}

        {checkedTickets.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">已检查结果：</h3>
            <ScrollArea className="h-[200px] rounded-md border">
              <ul className="p-2 space-y-3">
                {checkedTickets.map((ticket) => (
                  <li key={`checked-${ticket.id}`} className={`p-3 rounded-lg shadow-sm border ${ticket.win ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex space-x-1">
                        {ticket.numbers.map(num => (
                           <span
                            key={num}
                            className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                              ${getBallColor(num, latestResult.numbers.includes(num) || num === latestResult.additionalNumber, num === latestResult.additionalNumber && ticket.numbers.includes(latestResult.additionalNumber))}`}
                          >
                            {num}
                          </span>
                        ))}
                      </div>
                      {ticket.win ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="mr-1 h-4 w-4" /> 中奖！
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="mr-1 h-4 w-4" /> 未中奖
                        </Badge>
                      )}
                    </div>
                    {ticket.win && (
                      <p className="text-sm font-medium text-green-700">
                        匹配 {ticket.win.matchedNumbers} 个号码{ticket.win.matchedAdditional ? " + 特别号码" : ""}。
                        奖项：{ticket.win.prize} (组别 {ticket.win.group})
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleCheckAllTickets} className="w-full" disabled={userTickets.length === 0}>
          <Search className="mr-2 h-4 w-4" /> 检查所有彩票
        </Button>
      </CardFooter>
    </Card>
  );
}
