import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "263786987358";
const DEFAULT_MESSAGE = "Hi! I'd like to know more about Zama AI Primary.";

export default function WhatsAppFloatingButton({ message = DEFAULT_MESSAGE }) {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all"
    >
      <MessageCircle className="w-5 h-5" />
      <span className="text-sm hidden sm:inline">Chat on WhatsApp</span>
    </a>
  );
}