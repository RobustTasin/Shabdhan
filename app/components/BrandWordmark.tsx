export default function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      <span className="site-wordmark-green text-[#006A4E]">sha</span>
      <span className="site-wordmark-red text-[#F42A41]">bd</span>
      <span className="site-wordmark-green text-[#006A4E]">han.</span>
    </span>
  );
}
