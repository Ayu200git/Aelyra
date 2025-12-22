import React from "react";
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

function SearchBox(){
  return (
    <div className="flex gap-2 p-4 border-t bg-background">
      <Input
        placeholder="Send a message..."
        className="flex-1"
      />
      <Button>Send</Button>
    </div>
  );
};

export default SearchBox;