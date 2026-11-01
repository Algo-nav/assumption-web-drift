import { DATASET_URL, SPACE_URL, GITHUB_URL } from "../lib/site";

export const metadata = { title: "About" };

export default function About() {
  return (
    <div className="stack">
      <h1>About</h1>
      <section className="card">
        <p style={{ margin: 0, maxWidth: 640 }}>
          assumption-drift is a product of SCND Order, built by Navneet. The dataset is released under the
          CC-BY-4.0 licence. Read the <a href={DATASET_URL}>dataset</a>, browse every row in the{" "}
          <a href={SPACE_URL}>Space</a>, or read the code on <a href={GITHUB_URL}>GitHub</a>.
        </p>
      </section>
    </div>
  );
}
