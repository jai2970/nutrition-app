"use client";

import { useState } from "react";
import AddEntryForm from "./AddEntryForm";
import SmartLogForm from "./SmartLogForm";

type FoodOption = {
  id: string;
  name: string;
  servingSizeG: number;
  servingLabel: string;
  caloriesPer100g: number;
};

export default function FoodLogClient({ foods }: { foods: FoodOption[] }) {
  const [searchSeed, setSearchSeed] = useState<{ name: string; ts: number } | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <SmartLogForm
        foods={foods}
        onSearchManually={(name) => setSearchSeed({ name, ts: Date.now() })}
      />
      <AddEntryForm foods={foods} searchSeed={searchSeed} />
    </div>
  );
}
