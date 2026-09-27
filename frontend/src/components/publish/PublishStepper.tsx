import { useI18n } from "../../i18n/I18nProvider";

const stepKeys = [
  "publish.stepCategory",
  "publish.stepInfo",
  "publish.stepPhotos",
  "publish.stepPrice",
  "publish.stepReview",
] as const;


export default function PublishStepper({
  currentStep,
}: {
  currentStep: number;
}) {
  const { t } = useI18n();

  return (
    <div className="publish-stepper">
      <div className="publish-stepper__header">
        <span>
          {t("publish.step")} {currentStep} {t("publish.stepOf")} {stepKeys.length}
        </span>

        <strong>
          {t(stepKeys[currentStep - 1])}
        </strong>
      </div>

      <div className="publish-progress">
        <div
          className="publish-progress__value"
          style={{
            width: `${
              (currentStep / stepKeys.length) * 100
            }%`,
          }}
        />
      </div>
    </div>
  );
}