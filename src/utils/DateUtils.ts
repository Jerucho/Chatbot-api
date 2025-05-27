// src/utils/DateUtils.ts

export class DateUtils {
  /**
   * Formats a Date object into a human-readable string with specific locale and timezone.
   * Defaults to 'es-PE' locale and 'America/Lima' timezone.
   * @param date The Date object to format.
   * @returns A formatted date and time string.
   */
  static formatForAI(date: Date): string {
    return date.toLocaleString("es-PE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZone: "America/Lima", // Consistent timezone for your context
    });
  }

  /**
   * Generates a context string for the AI including current time and optionally last contact time.
   * @param lastContactAt Optional. The last contact date from your Chat document.
   * @returns A string to be prepended to the AI's system instruction.
   */
  static generateAiContext(lastContactAt?: Date): string {
    const currentTimeString = DateUtils.formatForAI(new Date());

    let context = `### Contexto Adicional:\n`;
    context += `- **Fecha y Hora Actual del Usuario:** ${currentTimeString}\n`;

    if (lastContactAt) {
      const lastContactString = DateUtils.formatForAI(lastContactAt);
      context += `- **Último Contacto Registrado:** ${lastContactString}\n`;
    }

    return context;
  }
}
