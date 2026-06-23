import { QuoteLoader } from "@/components/quote-loader";

/** 进入用户中心时的加载页：复用骚话等待，但不写入文章题记交接状态。 */
export default function Loading() {
  return <QuoteLoader persistForArticle={false} />;
}
