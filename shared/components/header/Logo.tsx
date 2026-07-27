import Image from "next/image";
import Link from "next/link";
import { useLocale } from "@/shared/lib/locale/LocaleProvider";

export default function Logo() {
  const { t } = useLocale();
  return (
    <Link href="/" className="brand">
      <div className="brand-mark">
        <Image src='/logo.png' className="bg-[#f4f1eb]" width={100} height={100} alt=""/>
      </div>
      <div>
        <h1 className="tracking-widest">{t("brand.title")}</h1>
        <p>{t("brand.subtitle")}</p>
      </div>
    </Link>
  );
}
