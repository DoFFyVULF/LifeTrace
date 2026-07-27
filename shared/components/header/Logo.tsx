import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="brand">
      <div className="brand-mark">
        <Image
          src="/Logo.png"
          alt="Life Trace"
          width={100}
          height={30}
          className="block object-contain"
          priority
          style={{padding:6}}
        />
      </div>
    </Link>
  );
}
