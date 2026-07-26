import Image from "next/image";

export default function Logo() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <Image src='/logo.png' className="bg-[#f4f1eb]" width={100} height={100} alt=""/>
      </div>
      <div>
        <h1 className="tracking-widest">LIFE TRACE</h1>
        <p>Personal atlas</p>
      </div>
    </div>
  );
}
