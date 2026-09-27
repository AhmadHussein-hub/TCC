import 'package:flutter/material.dart';

class DashboardHeader extends StatelessWidget {
  final String patientName;
  final int
  completedDoses; // Mantido apenas para compatibilidade com a HomeScreen
  final int totalDoses; // Mantido apenas para compatibilidade com a HomeScreen
  final String dateText; // Mantido apenas para compatibilidade com a HomeScreen
  final VoidCallback? onLogout;
  final VoidCallback? onAiReportTap;

  const DashboardHeader({
    super.key,
    required this.patientName,
    required this.completedDoses,
    required this.totalDoses,
    required this.dateText,
    this.onLogout,
    this.onAiReportTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.only(top: 60, left: 24, right: 24, bottom: 32),
      decoration: const BoxDecoration(
        color: Color(0xFF2563EB),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'ACOMPANHANDO',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    patientName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  // Botão de Relatório de IA
                  IconButton(
                    icon: const Icon(Icons.auto_awesome, color: Colors.white),
                    tooltip: 'Relatório de IA',
                    onPressed: onAiReportTap,
                  ),
                  const SizedBox(width: 8),
                  // Botão de Perfil / Logout
                  GestureDetector(
                    onTap: onLogout,
                    child: const CircleAvatar(
                      backgroundColor: Colors.white24,
                      child: Icon(Icons.person, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ],
          ),
          // O Card de Progresso com a percentagem foi totalmente removido daqui
        ],
      ),
    );
  }
}
