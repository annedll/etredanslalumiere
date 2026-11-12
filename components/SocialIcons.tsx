import React from "react";

type P = { className?: string };

export function FacebookIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13.5 21v-8h2.7l.4-3.2h-3.1V7.8c0-.9.3-1.5 1.6-1.5h1.7V3.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.4H7.7V13h2.7v8h3.1z" />
    </svg>
  );
}

export function WhatsAppIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a9.9 9.9 0 0 0-8.5 15L2 22l5.1-1.4A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.200zm4.5-6.1c-.2-.1-1.500-.7-1.700-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.8-.4-1.600-.9-2.300-1.700-.5-.6-.9-1.200-1-1.400-.1-.2 0-.3.1-.5l.4-.4c.1-.1.1-.2.2-.4.1-.1 0-.3 0-.4l-.8-1.800c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.6.600-.9 1.300-.9 2.100.1 1 .5 2 1.200 2.800 1.300 1.700 3 2.900 5 3.500.700.200 1.300.2 1.800.1.600-.1 1.500-.6 1.700-1.200.2-.6.2-1.100.1-1.200-.1-.1-.3-.2-.5-.3z" />
    </svg>
  );
}

export function MessengerIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.500 2 2 6.200 2 11.400c0 2.900 1.400 5.500 3.600 7.200V22l3.300-1.800c.9.300 2 .4 3.100.4 5.500 0 10-4.200 10-9.400S17.500 2 12 2zm1 12.600-2.500-2.700-4.900 2.700 5.400-5.800 2.600 2.700 4.800-2.700-5.400 5.800z" />
    </svg>
  );
}
