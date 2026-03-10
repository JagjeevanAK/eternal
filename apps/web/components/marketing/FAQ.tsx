import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const FAQ = () => {
  return (
    <div className="mt-16 max-w-2xl mx-auto text-left">
      <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Frequently Asked Questions</h2>
      <Accordion type="single" collapsible className="w-full space-y-4">
        <AccordionItem value="item-1" className="border-none bg-card rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline text-foreground py-4">
            What does Eternal do?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground pb-4">
            Eternal lets asset issuers register real-world assets, attach supporting documents, get them verified,
            and split them into tradable fractions on Solana.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2" className="border-none bg-card rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline text-foreground py-4">
            Which assets fit this platform?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground pb-4">
            The current product is built for real estate, gold, infrastructure, vehicles, art, commodities, and similar
            assets that benefit from fractional ownership.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3" className="border-none bg-card rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline text-foreground py-4">
            Why use Solana for this?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground pb-4">
            Solana gives the app low settlement costs, fast transaction finality, and transparent on-chain state for
            ownership, tokenization, and trading actions.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-4" className="border-none bg-card rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline text-foreground py-4">
            What network does the app use?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground pb-4">
            The default app flow uses Solana devnet, and the localhost demo can be pointed at localnet with the
            configured RPC endpoint so judges can see the full flow without relying on devnet faucet balance.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
