from datetime import datetime

class AlertProcessor:
    def __init__(self):
        self.alert_rules = []
        self.active_alerts = []
    
    def add_rule(self, rule):
        """Add an alert rule"""
        self.alert_rules.append(rule)
    
    def check_conditions(self, message):
        """Check if message triggers any alerts"""
        triggered_alerts = []
        
        for rule in self.alert_rules:
            if self._evaluate_rule(rule, message):
                alert = self._create_alert(rule, message)
                triggered_alerts.append(alert)
                self.active_alerts.append(alert)
        
        return triggered_alerts
    
    def _evaluate_rule(self, rule, message):
        """Evaluate if a rule condition is met"""
        # Example rule structure: {'field': 'priority', 'operator': '>', 'value': 5}
        field = rule.get('field')
        operator = rule.get('operator')
        threshold = rule.get('value')
        
        message_value = message.get(field)
        
        if operator == '>':
            return message_value > threshold
        elif operator == '<':
            return message_value < threshold
        elif operator == '==':
            return message_value == threshold
        elif operator == '>=':
            return message_value >= threshold
        elif operator == '<=':
            return message_value <= threshold
        
        return False
    
    def _create_alert(self, rule, message):
        """Create alert object"""
        return {
            'id': f"alert_{datetime.now().timestamp()}",
            'rule_name': rule.get('name'),
            'severity': rule.get('severity', 'medium'),
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'status': 'active'
        }
    
    def get_active_alerts(self):
        """Get all active alerts"""
        return [alert for alert in self.active_alerts if alert['status'] == 'active']
    
    def acknowledge_alert(self, alert_id):
        """Mark alert as acknowledged"""
        for alert in self.active_alerts:
            if alert['id'] == alert_id:
                alert['status'] = 'acknowledged'
                return True
        return False
    
    def resolve_alert(self, alert_id):
        """Mark alert as resolved"""
        for alert in self.active_alerts:
            if alert['id'] == alert_id:
                alert['status'] = 'resolved'
                return True
        return False

# Global alert processor instance
alert_processor = AlertProcessor()

def process_alert(message):
    """Process a message and check for alerts"""
    return alert_processor.check_conditions(message)

def get_alerts():
    """Get all active alerts"""
    return alert_processor.get_active_alerts()
