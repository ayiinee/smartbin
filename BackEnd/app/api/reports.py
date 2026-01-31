from io import BytesIO, StringIO
import csv

from flask import Blueprint, Response, current_app, jsonify, request, send_file

from app.services.genai_reports import generate_gemini_insight, get_reporting_summary

reports_bp = Blueprint("reports", __name__)


@reports_bp.get("/export")
def export_report():
    fmt = (request.args.get("format") or "csv").lower()
    days = int(request.args.get("days", 7))
    summary = get_reporting_summary(days=days)

    if fmt == "csv":
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["SmartBin Analytics Report"])
        writer.writerow([f"Period: {summary['range_start']} to {summary['range_end']} (UTC)"])
        writer.writerow([])
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Total Logs", summary["total_logs"]])
        writer.writerow(["Active Bins", f"{summary['active_bins']} / {summary['total_bins']}"])
        writer.writerow(["Carbon Avoided (kg CO2e)", summary["carbon_avoided"]])
        writer.writerow(["Methane Avoided (kg)", summary["methane_avoided"]])
        writer.writerow(["Total Waste (kg)", summary["composition"]["total_weight"]])
        writer.writerow([])
        writer.writerow(["Waste Composition", "Weight (kg)", "Percent"])
        for item in summary["composition"]["categories"]:
            writer.writerow([item["label"], item["value"], f"{item['percent']}%"])

        response = Response(output.getvalue(), mimetype="text/csv")
        response.headers["Content-Disposition"] = "attachment; filename=smartbin_report.csv"
        return response

    if fmt == "pdf":
        try:
            from reportlab.lib.pagesizes import LETTER
            from reportlab.pdfgen import canvas
        except Exception as exc:  # pragma: no cover
            return jsonify({"error": "PDF generator tidak tersedia.", "message": str(exc)}), 500

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=LETTER)
        width, height = LETTER
        y = height - 48

        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawString(48, y, "SmartBin Analytics Report")
        y -= 22

        pdf.setFont("Helvetica", 10)
        pdf.drawString(48, y, f"Period: {summary['range_start']} to {summary['range_end']} (UTC)")
        y -= 18

        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(48, y, "Summary")
        y -= 16

        pdf.setFont("Helvetica", 10)
        summary_lines = [
            f"Total Logs: {summary['total_logs']}",
            f"Active Bins: {summary['active_bins']} / {summary['total_bins']}",
            f"Carbon Avoided: {summary['carbon_avoided']} kg CO2e",
            f"Methane Avoided: {summary['methane_avoided']} kg",
            f"Total Waste: {summary['composition']['total_weight']} kg",
        ]
        for line in summary_lines:
            pdf.drawString(56, y, line)
            y -= 14

        y -= 6
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(48, y, "Waste Composition")
        y -= 16

        pdf.setFont("Helvetica", 10)
        for item in summary["composition"]["categories"]:
            pdf.drawString(56, y, f"{item['label']}: {item['value']} kg ({item['percent']}%)")
            y -= 14
            if y <= 64:
                pdf.showPage()
                pdf.setFont("Helvetica", 10)
                y = height - 48

        pdf.showPage()
        pdf.save()
        buffer.seek(0)
        return send_file(
            buffer,
            mimetype="application/pdf",
            as_attachment=True,
            download_name="smartbin_report.pdf",
        )

    return jsonify({"error": "format_tidak_didukung"}), 400


@reports_bp.post("/chat")
def reports_chat():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "Pesan tidak boleh kosong."}), 400

    days = int(data.get("days", 7))
    history = data.get("history") or []
    summary = get_reporting_summary(days=days)

    try:
        reply = generate_gemini_insight(message, summary, history)
        return jsonify({"reply": reply, "generated_at": summary["generated_at"]})
    except Exception as exc:
        current_app.logger.exception("Gemini chat failed")
        return jsonify({"error": str(exc), "type": "gemini_error"}), 500
