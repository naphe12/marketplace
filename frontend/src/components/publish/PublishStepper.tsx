const steps = [
  "Catégorie",
  "Informations",
  "Photos",
  "Prix",
  "Vérification",
];


export default function PublishStepper({
  currentStep,
}: {
  currentStep: number;
}) {
  return (
    <div className="publish-stepper">
      <div className="publish-stepper__header">
        <span>
          Étape {currentStep} sur {steps.length}
        </span>

        <strong>
          {steps[currentStep - 1]}
        </strong>
      </div>

      <div className="publish-progress">
        <div
          className="publish-progress__value"
          style={{
            width: `${
              (currentStep / steps.length) * 100
            }%`,
          }}
        />
      </div>
    </div>
  );
}