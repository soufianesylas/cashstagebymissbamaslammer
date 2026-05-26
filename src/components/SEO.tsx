import { Helmet } from "react-helmet-async";

type Props = {
  title: string;
  description: string;
  path: string;
  schema?: object;
};

const BASE = "https://https-cashstagebymissbamaslammer-lovable-app.lovable.app";

const SEO = ({ title, description, path, schema }: Props) => {
  const url = `${BASE}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {schema && <script type="application/ld+json">{JSON.stringify(schema)}</script>}
    </Helmet>
  );
};

export default SEO;
