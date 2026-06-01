export default function FormNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-8 py-12">
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-3xl text-text-primary mb-4">
          Formulaire introuvable
        </h1>

        <p className="text-lg text-text-secondary mb-6 leading-relaxed">
          Ce formulaire n'existe pas ou n'est plus accessible.
        </p>

        <p className="text-sm text-text-tertiary">
          Vérifiez l'adresse ou contactez la personne qui vous a partagé ce lien.
        </p>
      </div>
    </div>
  );
}