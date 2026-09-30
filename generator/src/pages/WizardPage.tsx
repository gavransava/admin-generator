import { useNavigate } from "react-router-dom";
import { useWizard } from "../store/wizard.js";
import { Step1Auth } from "../wizard/Step1Auth.js";
import { Step2Resources } from "../wizard/Step2Resources.js";
import { Step3Fields } from "../wizard/Step3Fields.js";
import { Step4CustomActions } from "../wizard/Step4CustomActions.js";
import { Step5Publish } from "../wizard/Step5Publish.js";

const stepLabels = ["Auth", "Resources", "Fields", "Actions", "Publish"];

export function WizardPage() {
  const nav = useNavigate();
  const doc = useWizard((s) => s.doc);
  const step = useWizard((s) => s.step);
  const setStep = useWizard((s) => s.setStep);
  const reset = useWizard((s) => s.reset);

  if (!doc) {
    nav("/", { replace: true });
    return null;
  }

  const stepEl = [null, <Step1Auth />, <Step2Resources />, <Step3Fields />, <Step4CustomActions />, <Step5Publish />][step];

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary-700">Admin Studio</h1>
        <button
          type="button"
          onClick={() => {
            reset();
            nav("/", { replace: true });
          }}
          className="text-sm text-gray-600 hover:underline"
        >
          Start over
        </button>
      </header>

      <ol className="flex gap-2 text-xs">
        {stepLabels.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3 | 4 | 5;
          const active = step === n;
          const done = step > n;
          return (
            <li
              key={label}
              className={`flex-1 py-2 px-3 rounded border ${
                active
                  ? "bg-primary-600 text-white border-primary-700"
                  : done
                    ? "bg-primary-50 text-primary-700 border-primary-200"
                    : "bg-beige-50 text-gray-500 border-beige-200"
              }`}
            >
              <button
                type="button"
                disabled={!done && !active}
                onClick={() => setStep(n)}
                className="w-full text-left disabled:cursor-not-allowed"
              >
                {i + 1}. {label}
              </button>
            </li>
          );
        })}
      </ol>

      <section className="bg-white border border-beige-200 rounded-lg p-6">
        {stepEl}
      </section>
    </div>
  );
}
