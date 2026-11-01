// The machine-reviewed label. It renders nothing until a row carries a machine review, so no empty
// slot sits in the layout. Switch it on by setting `machineReviewed` on the row in the data layer.
export default function ReviewMachine({ row }) {
  if (!row || !row.machineReviewed) return null;
  return (
    <span className="status" data-slot="review-machine" data-testid="review-machine">
      review: machine-reviewed
    </span>
  );
}
