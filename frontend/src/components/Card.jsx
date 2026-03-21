const Card = ({ title, value, icon: Icon, trend, className = "" }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
          {trend && (
            <p
              className={`text-sm mt-2 ${trend > 0 ? "text-green-500" : "text-red-500"}`}
            >
              {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-blue-100 rounded-full">
            <Icon className="w-8 h-8 text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;
