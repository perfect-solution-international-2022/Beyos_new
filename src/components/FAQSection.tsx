import SectionHeader from "./SectionHeader";

export const homepageFaqs = [
  { question: "How long does delivery take?", answer: "Orders are usually delivered within 2–4 business days after confirmation. Delivery time can vary slightly by location and courier conditions." },
  { question: "Can I pay with cash on delivery?", answer: "Yes. Cash on Delivery is available for products that have COD enabled. The checkout shows only the payment methods available for every item in your cart." },
  { question: "Can I exchange an item?", answer: "Contact Beyos support as soon as possible with your order number and the item details. The team will confirm eligibility and guide you through the exchange process." },
  { question: "Do you offer custom T-shirt printing?", answer: "Yes. Beyos handles individual, team and business T-shirt printing with custom designs, sizes and finishes. Contact us with your artwork and quantity for a quote." },
  { question: "How do I choose the right size?", answer: "Check the size options and measurements shown on the product page. For an oversized fit, compare the garment measurements with a T-shirt that already fits you well." },
];

export default function FAQSection() {
  return (
    <section className="container-x mt-20" aria-labelledby="faq-heading">
      <SectionHeader eyebrow="Need to know" title="Frequently Asked Questions" />
      <div className="mx-auto max-w-4xl divide-y divide-navy-800/10 border-y border-navy-800/10">
        {homepageFaqs.map((faq) => (
          <details key={faq.question} name="homepage-faq" className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-left text-sm font-bold text-navy-800 marker:content-none sm:text-base">
              {faq.question}
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xl font-normal text-navy-800 transition group-open:rotate-45 group-open:bg-brand group-open:text-white" aria-hidden="true">+</span>
            </summary>
            <p className="max-w-3xl pb-5 pr-12 text-sm leading-6 text-navy-800/65">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
